import { SeatStatus, TicketTier } from '@mad/shared';
import { Schema, model, Document, Types } from 'mongoose';

export interface ISeatLayout extends Document {
  eventId: Types.ObjectId;
  rows: number;
  columns: number;
  sections: {
    name: string;
    rows: string[];
    tier: TicketTier;
    color?: string;
  }[];
  seats: {
    seatId: string;
    row: string;
    number: number;
    section?: string;
    status: SeatStatus;
    tier: TicketTier;
    price: number;
    lockedBy?: string;
    lockedAt?: Date;
    bookedByBookingId?: string;
    reservationId?: string;
    seatVersion: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const seatSchema = new Schema(
  {
    seatId: { type: String, required: true },
    row: { type: String, required: true },
    number: { type: Number, required: true },
    section: String,
    status: {
      type: String,
      enum: Object.values(SeatStatus),
      default: SeatStatus.AVAILABLE,
    },
    tier: { type: String, enum: Object.values(TicketTier), required: true },
    price: { type: Number, required: true, min: 0 },
    lockedBy: String, // socket session ID
    lockedAt: Date,
    bookedByBookingId: String,
    reservationId: String,
    seatVersion: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const seatLayoutSchema = new Schema<ISeatLayout>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true,
      index: true,
    },
    rows: { type: Number, required: true, min: 1 },
    columns: { type: Number, required: true, min: 1 },
    sections: [
      {
        name: String,
        rows: [String],
        tier: { type: String, enum: Object.values(TicketTier) },
        color: String,
        _id: false,
      },
    ],
    seats: [seatSchema],
  },
  { timestamps: true }
);

seatLayoutSchema.index({ 'seats.seatId': 1, eventId: 1 });
seatLayoutSchema.index({ 'seats.status': 1, eventId: 1 });

export const SeatLayout = model<ISeatLayout>('SeatLayout', seatLayoutSchema);
