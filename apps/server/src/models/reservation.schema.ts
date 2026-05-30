import crypto from 'crypto';
import { InventoryState, ReservationStatus, TicketTier } from '@mad/shared';
import { Schema, model, Document, Types } from 'mongoose';

export interface IReservation extends Document {
  reservationId: string;
  eventId: Types.ObjectId;
  seatId?: string;
  section?: string;
  tier?: TicketTier;
  sessionId?: string;
  socketId?: string;
  userId?: Types.ObjectId;
  quantity: number;
  status: ReservationStatus;
  inventoryState: InventoryState;
  expiresAt: Date;
  paymentReference?: string;
  bookingReference?: string;
  bookingId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  correlationId?: string;
  reservationVersion: number;
  eventVersion: number;
  seatVersion: number;
  transitionLog: {
    from: string;
    to: string;
    reason?: string;
    correlationId?: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const transitionSchema = new Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    reason: String,
    correlationId: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reservationSchema = new Schema<IReservation>(
  {
    reservationId: { type: String, required: true, unique: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    seatId: { type: String, index: true, sparse: true },
    section: String,
    tier: { type: String, enum: Object.values(TicketTier) },
    sessionId: { type: String, index: true },
    socketId: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(ReservationStatus), required: true },
    inventoryState: { type: String, enum: Object.values(InventoryState), required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    paymentReference: String,
    bookingReference: { type: String, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', index: true },
    correlationId: { type: String, index: true },
    reservationVersion: { type: Number, default: 1, min: 1 },
    eventVersion: { type: Number, default: 1, min: 1 },
    seatVersion: { type: Number, default: 1, min: 1 },
    transitionLog: { type: [transitionSchema], default: [] },
  },
  { timestamps: true }
);

reservationSchema.index(
  { eventId: 1, seatId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      seatId: { $exists: true },
      status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT, ReservationStatus.CONFIRMED] },
    },
  }
);
reservationSchema.index({ eventId: 1, tier: 1, status: 1, quantity: 1 });
reservationSchema.index({ eventId: 1, status: 1, quantity: 1 });
reservationSchema.index(
  { status: 1, updatedAt: -1 },
  {
    partialFilterExpression: {
      seatId: { $exists: true },
    },
  }
);
reservationSchema.index({ status: 1, updatedAt: -1 });
reservationSchema.index({ status: 1, expiresAt: 1 });
reservationSchema.index({ bookingId: 1, status: 1 });

reservationSchema.pre('validate', function (next) {
  if (!this.reservationId) {
    this.reservationId = `RSV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  next();
});

export const Reservation = model<IReservation>('Reservation', reservationSchema);
