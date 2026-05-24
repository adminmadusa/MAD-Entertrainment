import { NotificationType } from '@mad/shared';
import { Document, model, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  type: NotificationType;
  bookingId?: Types.ObjectId;
  eventId?: Types.ObjectId;
  channel: string;
  recipient?: string;
  subject?: string;
  body?: string;
  isSent: boolean;
  retryCount: number;
}

const notificationSchema = new Schema<INotification>(
  {
    type: { type: String, enum: Object.values(NotificationType), required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    channel: { type: String, required: true },
    recipient: String,
    subject: String,
    body: String,
    isSent: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Notification = model<INotification>('Notification', notificationSchema);
