import { Document, model, Schema, Types } from 'mongoose';

import { NotificationType } from '@mad/shared';

export interface INotification extends Document {
  type: NotificationType;
  bookingId?: Types.ObjectId;
  eventId?: Types.ObjectId;
  channel: string;
  recipient?: string;
  subject?: string;
  body?: string;
  status?: 'queued' | 'processing' | 'sent' | 'failed';
  jobId?: string;
  errorMessage?: string;
  queuedAt?: Date;
  processedAt?: Date;
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
    status: { type: String, enum: ['queued', 'processing', 'sent', 'failed'] },
    jobId: { type: String },
    errorMessage: String,
    // Data Retention Policy: Auto-expire and clean up operational notification/email logs after 30 days
    queuedAt: { type: Date, index: { expires: '30d' } },
    processedAt: Date,
    isSent: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

notificationSchema.index(
  { jobId: 1 },
  {
    unique: true,
    partialFilterExpression: { jobId: { $type: 'string' } },
    background: true,
  }
);

export const Notification = model<INotification>('Notification', notificationSchema);
