import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISuppression extends Document {
  email: string;
  reason?: string;
  source?: 'unsubscribe' | 'bounce' | 'complaint';
  createdAt: Date;
  updatedAt: Date;
}

const suppressionSchema = new Schema<ISuppression>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    reason: {
      type: String,
    },
    source: {
      type: String,
      enum: ['unsubscribe', 'bounce', 'complaint'],
    },
  },
  {
    timestamps: true,
  }
);

export const Suppression: Model<ISuppression> =
  mongoose.models.Suppression || mongoose.model<ISuppression>('Suppression', suppressionSchema);
