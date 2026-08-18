import { Schema, model, Document, Types } from 'mongoose';

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export enum MediaVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

export interface IEventGallery extends Document {
  eventId: Types.ObjectId;
  mediaType: MediaType;
  url: string;
  publicId: string;
  thumbnail?: string;
  caption?: string;
  sortOrder: number;
  isCover: boolean;
  visibility: MediaVisibility;
  uploadedBy?: Types.ObjectId;
  assetProvider: string;
  assetVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const eventGallerySchema = new Schema<IEventGallery>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    mediaType: { type: String, enum: Object.values(MediaType), required: true, default: MediaType.IMAGE },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    thumbnail: { type: String },
    caption: { type: String },
    sortOrder: { type: Number, required: true, default: 0 },
    isCover: { type: Boolean, required: true, default: false },
    visibility: { type: String, enum: Object.values(MediaVisibility), default: MediaVisibility.PUBLIC, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assetProvider: { type: String, required: true, default: 'cloudinary' },
    assetVersion: { type: String }
  },
  { timestamps: true }
);

// Indexes
eventGallerySchema.index({ eventId: 1 });
eventGallerySchema.index({ sortOrder: 1 });
eventGallerySchema.index({ visibility: 1 });
eventGallerySchema.index({ isCover: 1 });
eventGallerySchema.index({ mediaType: 1 });

// Ensure only one cover image per event
eventGallerySchema.index(
  { eventId: 1, isCover: 1 },
  { unique: true, partialFilterExpression: { isCover: true } }
);

export const EventGallery = model<IEventGallery>('EventGallery', eventGallerySchema);
