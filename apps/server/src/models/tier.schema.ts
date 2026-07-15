import mongoose, { Schema, Document } from 'mongoose';

export interface ITier extends Document {
  name: string;
  slug: string;
  isDeleted: boolean;
  icon?: string;
  color?: string;
  description?: string;
  isActive: boolean;
  defaultVisibility: boolean;
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const tierSchema = new Schema<ITier>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
    icon: { type: String, default: 'ticket' },
    color: { type: String, default: '#6366F1' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    defaultVisibility: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Tier =
  (mongoose.models.Tier as mongoose.Model<ITier>) ||
  mongoose.model<ITier>('Tier', tierSchema);
