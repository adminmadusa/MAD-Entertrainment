import { BookingStatus, TicketTier } from '@mad/shared';
import { Schema, model, Document, Types } from 'mongoose';

export interface IBooking extends Document {
  bookingId: string;
  eventId: Types.ObjectId;
  userId?: Types.ObjectId;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  tickets: {
    tier: TicketTier;
    tierName: string;
    quantity: number;
    pricePerTicket: number;
    subtotal: number;
    seats?: {
      seatId: string;
      row: string;
      number: number;
      section?: string;
    }[];
  }[];
  totalTickets: number;
  subtotal: number;
  convenienceFee: number;
  gst: number;
  discount: number;
  totalAmount: number;
  currency: string;
  couponCode?: string;
  couponId?: Types.ObjectId;
  status: BookingStatus;
  paymentId?: Types.ObjectId;
  reservationIds?: string[];
  bookingVersion: number;
  expiresAt?: Date;
  cancellationReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // Format: MAD-YYYY-XXXXX
    },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestName: String,
    guestEmail: { type: String, lowercase: true, trim: true },
    guestPhone: String,
    tickets: [
      {
        tier: { type: String, enum: Object.values(TicketTier), required: true },
        tierName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        pricePerTicket: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
        seats: [
          {
            seatId: String,
            row: String,
            number: Number,
            section: String,
            _id: false,
          },
        ],
        _id: false,
      },
    ],
    totalTickets: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    convenienceFee: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    couponCode: String,
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.AWAITING_PAYMENT,
      index: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL for pending bookings
    cancellationReason: String,
    cancelledAt: Date,
  },
<<<<<<< Updated upstream
  { timestamps: true }
);
=======
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  reservationIds: [{ type: String }],
  bookingVersion: { type: Number, default: 1, min: 1 },
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL for pending bookings
  cancellationReason: String,
  cancelledAt: Date,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
bookingSchema.virtual('price').get(function(this: any) { return this.pricePerTicket; });
bookingSchema.virtual('amount').get(function(this: any) { return this.totalAmount; });
>>>>>>> Stashed changes

bookingSchema.index({ guestEmail: 1, createdAt: -1 });
bookingSchema.index({ guestPhone: 1, createdAt: -1 });
bookingSchema.index({ eventId: 1, status: 1 });

bookingSchema.pre('validate', function (next) {
  if (!this.bookingId) {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 5; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.bookingId = `MAD-${year}-${randomPart}`;
  }
  next();
});

export const Booking = model<IBooking>('Booking', bookingSchema);
