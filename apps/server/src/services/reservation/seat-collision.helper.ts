import { Types } from 'mongoose';
import { BookingMode, TicketTier } from '@mad/shared';

export interface ReservationRequest {
  eventId: Types.ObjectId;
  bookingMode: BookingMode;
  tier: TicketTier;
  quantity: number; // Represents Admission Count (not Package Count) as per MAD-COUPLE-004
  seats?: { seatId: string; section?: string }[];
  sessionId: string;
  socketId?: string;
  userId?: string;
  bookingId?: Types.ObjectId;
  bookingReference?: string;
  correlationId?: string;
  expiresAt: Date;
}

interface MongoDuplicateKeyError {
  code?: number | string;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
  message?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Strictly verifies whether a MongoDB error represents a verified seat collision
 * on the partial unique index { eventId: 1, seatId: 1 } (default name: eventId_1_seatId_1)
 * of the Reservation collection.
 */
export function isSeatReservationCollision(err: unknown): boolean {
  if (!isRecord(err)) {
    return false;
  }

  const errObj = err as MongoDuplicateKeyError;
  const code = errObj.code;
  if (code !== 11000 && code !== '11000') {
    return false;
  }

  // Strict check 1: Driver keyPattern contains BOTH eventId and seatId
  if (isRecord(errObj.keyPattern)) {
    const hasEventId = Object.prototype.hasOwnProperty.call(errObj.keyPattern, 'eventId');
    const hasSeatId = Object.prototype.hasOwnProperty.call(errObj.keyPattern, 'seatId');
    if (hasEventId && hasSeatId) {
      return true;
    }
  }

  // Strict check 2: Error message explicitly contains the specific partial index name
  const message = typeof errObj.message === 'string' ? errObj.message : '';
  if (message.includes('eventId_1_seatId_1')) {
    if (isRecord(errObj.keyValue)) {
      const hasEvent = Object.prototype.hasOwnProperty.call(errObj.keyValue, 'eventId');
      const hasSeat = Object.prototype.hasOwnProperty.call(errObj.keyValue, 'seatId');
      if (hasEvent && hasSeat) {
        return true;
      }
    }
    return true;
  }

  return false;
}
