import mongoose, { Schema, Document } from 'mongoose';

export interface IDJOperator extends Document {
  name: string;
  slug: string;
  bio?: string;
  specialties?: string[];
  profileImage?: { url: string; publicId: string };
  socialLinks?: { platform: string; url: string }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cloudinaryImageSchema = new Schema(
  { url: { type: String, required: true }, publicId: { type: String, required: true } },
  { _id: false }
);

const djOperatorSchema = new Schema<IDJOperator>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    bio: { type: String, maxlength: 3000 },
    specialties: [String],
    profileImage: cloudinaryImageSchema,
    socialLinks: [
      new Schema(
        { platform: { type: String, required: true }, url: { type: String, required: true } },
        { _id: false }
      ),
    ],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const DJOperator =
  (mongoose.models.DJOperator as mongoose.Model<IDJOperator>) ||
  mongoose.model<IDJOperator>('DJOperator', djOperatorSchema);
