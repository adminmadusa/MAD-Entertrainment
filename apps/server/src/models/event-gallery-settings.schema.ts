import { Schema, model, Document, Types } from 'mongoose';

export interface IEventGallerySettings extends Document {
  eventId: Types.ObjectId;
  heading?: string;
  thankYouMessage?: string;
  highlights?: string[];
  published: boolean;
  publishedAt?: Date;
  publishedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const eventGallerySettingsSchema = new Schema<IEventGallerySettings>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
    heading: { type: String },
    thankYouMessage: { type: String },
    highlights: [{ type: String }],
    published: { type: Boolean, default: false },
    publishedAt: { type: Date },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const EventGallerySettings = model<IEventGallerySettings>('EventGallerySettings', eventGallerySettingsSchema);
