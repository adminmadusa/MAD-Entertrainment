import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IVenue extends Document {
  name: string;
  city?: string;
  state?: string;
  address?: string;
  capacity?: number;
}

const venueSchema = new Schema<IVenue>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String },
    state: { type: String },
    address: { type: String },
    capacity: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export const Venue =
  // Prevent OverwriteModelError when hot‑reloading with tsx/nodemon
  (mongoose.models.Venue as mongoose.Model<IVenue>) ||
  mongoose.model<IVenue>('Venue', venueSchema);
