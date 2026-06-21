import { TicketTier } from '@mad/shared';
import { Document, model, Schema, Types } from 'mongoose';

export interface ITicket extends Document {
  ticketId: string;
  bookingId: Types.ObjectId;
  eventId: Types.ObjectId;
  tierName: string;
  tier: TicketTier;
  admits: number;
  seatId?: string;
  row?: string;
  seatNumber?: number;
  section?: string;
  qrCode: string;
  qrCodeImage?: string;
  scannedAt?: Date;
  scannedById?: Types.ObjectId;
  status: 'active' | 'voided' | 'replaced';
  replacedByTicketId?: string;
  replacedAt?: Date;
  replacementReason?: 'EMAIL_CORRECTION' | 'ADMIN_REISSUE' | 'FRAUD_PREVENTION';
  attendeeUserId?: Types.ObjectId;
  attendeeEmail?: string;
  assignmentStatus: 'unassigned' | 'pending' | 'claimed';
  claimedAt?: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    tierName: { type: String, required: true },
    tier: { type: String, enum: Object.values(TicketTier), required: true },
    admits: { type: Number, default: 1, min: 1 },
    seatId: String,
    row: String,
    seatNumber: Number,
    section: String,
    qrCode: { type: String, required: true },
    qrCodeImage: String,
    scannedAt: Date,
    scannedById: { type: Schema.Types.ObjectId, ref: 'Admin', index: true },
    status: { type: String, enum: ['active', 'voided', 'replaced'], default: 'active', required: true },
    replacedByTicketId: String,
    replacedAt: Date,
    replacementReason: { type: String, enum: ['EMAIL_CORRECTION', 'ADMIN_REISSUE', 'FRAUD_PREVENTION'] },
    attendeeUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    attendeeEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    assignmentStatus: {
      type: String,
      enum: ['unassigned', 'pending', 'claimed'],
      default: 'unassigned',
      required: true,
    },
    claimedAt: Date,
  },
  { timestamps: true }
);

ticketSchema.index({ bookingId: 1, scannedAt: 1 });
ticketSchema.index({ eventId: 1, scannedAt: 1 });
ticketSchema.index({ scannedAt: 1 });
ticketSchema.index({ attendeeUserId: 1 });
ticketSchema.index({ attendeeEmail: 1, assignmentStatus: 1 });

export const Ticket = model<ITicket>('Ticket', ticketSchema);

