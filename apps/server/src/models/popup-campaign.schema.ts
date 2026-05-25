import { PopupTrigger } from '@mad/shared';
import mongoose, { Schema, Document } from 'mongoose';

export interface IPopupCampaign extends Document {
  name: string;
  title: string;
  description?: string;
  image?: { url: string; publicId: string };
  ctaUrl?: string;
  ctaText?: string;
  trigger: PopupTrigger;
  triggerDelay?: number;
  cooldownHours?: number;
  priority: number;
  showOnPages?: string[];
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  linkedEvent?: {
    eventId?: mongoose.Types.ObjectId;
    showCountdown?: boolean;
    earlyBirdDeadline?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const cloudinaryImageSchema = new Schema(
  { url: { type: String, required: true }, publicId: { type: String, required: true } },
  { _id: false }
);

const popupCampaignSchema = new Schema<IPopupCampaign>(
  {
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    image: cloudinaryImageSchema,
    ctaUrl: String,
    ctaText: String,
    trigger: {
      type: String,
      enum: Object.values(PopupTrigger),
      required: true,
      default: PopupTrigger.ON_LOAD,
    },
    triggerDelay: { type: Number, min: 0, default: 0 },
    cooldownHours: { type: Number, min: 0, default: 24 },
    priority: { type: Number, default: 0, min: 0 },
    showOnPages: [String],
    isActive: { type: Boolean, default: true, index: true },
    startDate: Date,
    endDate: { type: Date, index: true },
    linkedEvent: new Schema(
      {
        eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
        showCountdown: { type: Boolean, default: false },
        earlyBirdDeadline: Date,
      },
      { _id: false }
    ),
  },
  { timestamps: true }
);

export const PopupCampaign =
  (mongoose.models.PopupCampaign as mongoose.Model<IPopupCampaign>) ||
  mongoose.model<IPopupCampaign>('PopupCampaign', popupCampaignSchema);
