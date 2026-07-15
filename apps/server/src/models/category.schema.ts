import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Category =
  (mongoose.models.Category as mongoose.Model<ICategory>) ||
  mongoose.model<ICategory>('Category', categorySchema);
