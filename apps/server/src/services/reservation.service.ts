import { BookingMode, InventoryState, ReservationStatus, SeatStatus, TicketTier } from '@mad/shared';
import { Types } from 'mongoose';

import { getRedis } from '../config/redis';
import { emitToAdmin, emitToEvent } from '../config/socket';
import { AppError } from '../middleware/error.middleware';
import { Event } from '../models/event.schema';
import { Reservation, IReservation } from '../models/reservation.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';

import { assertReservationTransition, reservationToInventoryState } from './inventory-state.service';

const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatus.RESERVED,
  ReservationStatus.PENDING_PAYMENT,
  ReservationStatus.CONFIRMED,
];

interface ReservationRequest {
  eventId: Types.ObjectId;
  bookingMode: BookingMode;
  tier: TicketTier;
  quantity: number;
  seats?: { seatId: string; section?: string }[];
  sessionId: string;
  socketId?: string;
  userId?: string;
  bookingId?: Types.ObjectId;
  bookingReference?: string;
  correlationId?: string;
  expiresAt: Date;
}

function safeEmit(label: string, emit: () => void, details: Record<string, unknown>) {
  try {
    emit();
  } catch (err) {
    logger.debug({ err, ...details }, `Socket emit skipped: ${label}`);
  }
}

export class ReservationService {
  static async reserveForBooking(request: ReservationRequest): Promise<IReservation[]> {
    if (request.bookingMode === BookingMode.SEAT_BASED) {
      return this.reserveSeats(request);
    }

    return this.reserveGeneralAdmission(request);
  }

  private static async reserveGeneralAdmission(request: ReservationRequest): Promise<IReservation[]> {
    const redis = getRedis();
    const lockKey = `mad:lock:reserve:event:${request.eventId}:tier:${request.tier}`;
    const lockVal = request.sessionId;

    // Acquire distributed lock with retry backoff
    let acquired = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ok = await redis.set(lockKey, lockVal, 'EX', 5, 'NX');
      if (ok === 'OK') {
        acquired = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!acquired) {
      throw AppError.badRequest('The ticketing system is currently busy. Please try again.');
    }

    try {
      const event = await Event.findById(request.eventId);
      if (!event) throw AppError.notFound('Event not found');

      const tierConfig = event.ticketTiers.find((t) => t.tier === request.tier);
      if (!tierConfig) {
        throw AppError.badRequest(`Ticket tier "${request.tier}" is invalid`);
      }

      // 1. Fetch active reservations count for this specific tier
      const activeTierAgg = await Reservation.aggregate([
        {
          $match: {
            eventId: request.eventId,
            tier: request.tier,
            status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }
          }
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);
      const tierReserved = activeTierAgg[0]?.total ?? 0;

      // 2. Validate tier capacity
      if (tierConfig.soldCount + tierReserved + request.quantity > tierConfig.totalCapacity) {
        throw AppError.badRequest(`Requested quantity for tier "${tierConfig.name}" exceeds remaining capacity`);
      }

      // 3. Validate overall event capacity
      if (event.soldCount + event.reservedCount + request.quantity > event.totalCapacity) {
        throw AppError.badRequest('Requested quantity exceeds remaining event capacity');
      }

      // 4. Atomically increment global event reserved count
      const updatedEvent = await Event.findByIdAndUpdate(
        request.eventId,
        { $inc: { reservedCount: request.quantity, eventVersion: 1 } },
        { new: true }
      );

      if (!updatedEvent) {
        throw AppError.badRequest('Failed to reserve capacity');
      }

      const reservation = await Reservation.create({
        eventId: request.eventId,
        tier: request.tier,
        section: request.tier,
        sessionId: request.sessionId,
        socketId: request.socketId,
        userId: request.userId ? new Types.ObjectId(request.userId) : undefined,
        quantity: request.quantity,
        status: ReservationStatus.RESERVED,
        inventoryState: InventoryState.RESERVED,
        expiresAt: request.expiresAt,
        bookingId: request.bookingId,
        bookingReference: request.bookingReference,
        correlationId: request.correlationId,
        eventVersion: updatedEvent.eventVersion,
        transitionLog: [{ from: InventoryState.AVAILABLE, to: InventoryState.RESERVED, reason: 'booking-created', correlationId: request.correlationId }],
      });

      this.emitReservationChange(updatedEvent._id.toString(), [reservation], 'reservation:reserved');

      auditLog({
        action: 'RESERVATION_ACQUIRED',
        actor: request.userId ? { type: 'user', id: request.userId } : { type: 'guest', id: request.sessionId },
        status: 'success',
        metadata: {
          eventId: request.eventId.toString(),
          reservationId: reservation.reservationId,
          tier: request.tier,
          quantity: request.quantity,
          bookingId: request.bookingId?.toString(),
        },
        description: `Reserved ${request.quantity} General Admission ticket(s) in tier "${request.tier}" for session ${request.sessionId}`
      });

      return [reservation];
    } finally {
      // Safely release the lock
      const currentVal = await redis.get(lockKey);
      if (currentVal === lockVal) {
        await redis.del(lockKey);
      }
    }
  }

  private static async reserveSeats(request: ReservationRequest): Promise<IReservation[]> {
    const seats = request.seats ?? [];
    if (seats.length !== request.quantity) {
      throw AppError.badRequest('Seat reservation quantity must match selected seats');
    }

    const reservations: IReservation[] = [];
    for (const seat of seats) {
      const reservation = new Reservation({
        eventId: request.eventId,
        seatId: seat.seatId,
        section: seat.section,
        tier: request.tier,
        sessionId: request.sessionId,
        socketId: request.socketId,
        userId: request.userId ? new Types.ObjectId(request.userId) : undefined,
        quantity: 1,
        status: ReservationStatus.RESERVED,
        inventoryState: InventoryState.RESERVED,
        expiresAt: request.expiresAt,
        bookingId: request.bookingId,
        bookingReference: request.bookingReference,
        correlationId: request.correlationId,
        transitionLog: [{ from: InventoryState.AVAILABLE, to: InventoryState.RESERVED, reason: 'booking-created', correlationId: request.correlationId }],
      });
      await reservation.save();
      reservations.push(reservation);
    }

    await Event.findByIdAndUpdate(request.eventId, {
      $inc: { reservedCount: request.quantity, eventVersion: 1 },
    });

    this.emitReservationChange(request.eventId.toString(), reservations, 'reservation:reserved');

    auditLog({
      action: 'RESERVATION_ACQUIRED',
      actor: request.userId ? { type: 'user', id: request.userId } : { type: 'guest', id: request.sessionId },
      status: 'success',
      metadata: {
        eventId: request.eventId.toString(),
        seatIds: seats.map((s) => s.seatId),
        tier: request.tier,
        quantity: request.quantity,
        bookingId: request.bookingId?.toString(),
      },
      description: `Reserved ${request.quantity} seat(s) [${seats.map(s => s.seatId).join(', ')}] in tier "${request.tier}" for session ${request.sessionId}`
    });

    return reservations;
  }

  static async transitionForBooking(
    bookingId: Types.ObjectId | string,
    toStatus: ReservationStatus,
    details: { paymentReference?: string; paymentId?: Types.ObjectId; correlationId?: string; reason?: string } = {}
  ): Promise<IReservation[]> {
    const reservations = await Reservation.find({ bookingId, status: { $in: ACTIVE_RESERVATION_STATUSES } });
    const transitioned: IReservation[] = [];

    for (const reservation of reservations) {
      assertReservationTransition(reservation.status, toStatus, {
        reservationId: reservation.reservationId,
        bookingId: String(bookingId),
      });

      const previousStatus = reservation.status;
      reservation.status = toStatus;
      reservation.inventoryState = reservationToInventoryState(toStatus);
      reservation.paymentReference = details.paymentReference ?? reservation.paymentReference;
      reservation.paymentId = details.paymentId ?? reservation.paymentId;
      reservation.correlationId = details.correlationId ?? reservation.correlationId;
      reservation.reservationVersion += 1;
      reservation.transitionLog.push({
        from: previousStatus,
        to: toStatus,
        reason: details.reason,
        correlationId: details.correlationId,
        createdAt: new Date(),
      });
      await reservation.save();
      transitioned.push(reservation);
    }

    if (transitioned.length > 0) {
      const eventId = transitioned[0].eventId.toString();
      this.emitReservationChange(eventId, transitioned, `reservation:${toStatus}`);

      auditLog({
        action: `RESERVATION_TRANSITION_${toStatus.toUpperCase()}`,
        status: 'success',
        metadata: {
          bookingId: bookingId.toString(),
          toStatus,
          details,
          transitionedIds: transitioned.map((t) => t.reservationId),
        },
        description: `Transitioned ${transitioned.length} reservation(s) for booking ${bookingId} to status ${toStatus}`,
      });
    }

    return transitioned;
  }

  static async releaseCapacityForTerminalReservations(reservations: IReservation[]): Promise<void> {
    const byEvent = new Map<string, number>();
    for (const reservation of reservations) {
      const eventId = reservation.eventId.toString();
      byEvent.set(eventId, (byEvent.get(eventId) ?? 0) + reservation.quantity);
    }

    for (const [eventId, quantity] of byEvent.entries()) {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { reservedCount: -quantity, eventVersion: 1 },
      });
    }
  }

  static async confirmCapacity(reservations: IReservation[]): Promise<void> {
    const byEvent = new Map<string, number>();
    for (const reservation of reservations) {
      const eventId = reservation.eventId.toString();
      byEvent.set(eventId, (byEvent.get(eventId) ?? 0) + reservation.quantity);
    }

    for (const [eventId, quantity] of byEvent.entries()) {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { reservedCount: -quantity, eventVersion: 1 },
      });
    }
  }

  static async expireReservations(now = new Date()): Promise<IReservation[]> {
    const stale = await Reservation.find({
      status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] },
      expiresAt: { $lte: now },
    }).limit(500);

    const expired: IReservation[] = [];
    for (const reservation of stale) {
      const previousStatus = reservation.status;
      reservation.status = ReservationStatus.EXPIRED;
      reservation.inventoryState = InventoryState.EXPIRED;
      reservation.reservationVersion += 1;
      reservation.transitionLog.push({ from: previousStatus, to: ReservationStatus.EXPIRED, reason: 'reservation-expired', createdAt: new Date() });
      await reservation.save();
      expired.push(reservation);
    }

    if (expired.length > 0) {
      await this.releaseCapacityForTerminalReservations(expired);
      await this.releaseExpiredSeats(expired);
      for (const [eventId, reservations] of this.groupByEvent(expired).entries()) {
        this.emitReservationChange(eventId, reservations, 'reservation:expired');
      }

      auditLog({
        action: 'RESERVATIONS_EXPIRED',
        status: 'success',
        metadata: {
          expiredCount: expired.length,
          reservations: expired.map((r) => ({
            reservationId: r.reservationId,
            eventId: r.eventId.toString(),
            tier: r.tier,
            quantity: r.quantity,
            seatId: r.seatId,
            bookingId: r.bookingId?.toString(),
          })),
        },
        description: `Expired ${expired.length} stale reservation(s) and released capacity/seats`,
      });
    }

    return expired;
  }

  private static async releaseExpiredSeats(reservations: IReservation[]) {
    const byEvent = this.groupByEvent(reservations.filter((reservation) => reservation.seatId));
    for (const [eventId, eventReservations] of byEvent.entries()) {
      const seatIds = eventReservations.map((reservation) => reservation.seatId).filter(Boolean);
      await SeatLayout.updateOne(
        { eventId },
        {
          $set: {
            'seats.$[seat].status': SeatStatus.AVAILABLE,
          },
          $unset: {
            'seats.$[seat].lockedBy': '',
            'seats.$[seat].lockedAt': '',
            'seats.$[seat].bookedByBookingId': '',
            'seats.$[seat].reservationId': '',
          },
          $inc: { 'seats.$[seat].seatVersion': 1 },
        },
        { arrayFilters: [{ 'seat.seatId': { $in: seatIds }, 'seat.status': SeatStatus.LOCKED }] }
      );
    }
  }

  static groupByEvent(reservations: IReservation[]): Map<string, IReservation[]> {
    const grouped = new Map<string, IReservation[]>();
    for (const reservation of reservations) {
      const eventId = reservation.eventId.toString();
      if (!grouped.has(eventId)) grouped.set(eventId, []);
      grouped.get(eventId)!.push(reservation);
    }
    return grouped;
  }

  private static emitReservationChange(eventId: string, reservations: IReservation[], eventName: string) {
    const payload = {
      eventId,
      reservationIds: reservations.map((reservation) => reservation.reservationId),
      seatIds: reservations.map((reservation) => reservation.seatId).filter(Boolean),
      version: Math.max(...reservations.map((reservation) => reservation.reservationVersion)),
      status: reservations[0]?.status,
    };

    safeEmit(eventName, () => emitToEvent(eventId, eventName, payload), { eventId, eventName });
    safeEmit(eventName, () => emitToAdmin('inventory', eventName, payload), { eventId, eventName });
  }
}
