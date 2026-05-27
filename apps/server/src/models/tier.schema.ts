import mongoose, { Schema, model, Document } from "mongoose";

export interface ITier extends Document {
  name: string;
  slug: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tierSchema = new Schema<ITier>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Tier =
  (mongoose.models.Tier as mongoose.Model<ITier>) ||
  mongoose.model<ITier>("Tier", tierSchema);
