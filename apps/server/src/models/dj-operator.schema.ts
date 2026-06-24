import mongoose, { Schema, Document } from 'mongoose';

export interface IDJOperator extends Document {
  name: string;
  slug: string;
  bio?: string;
  specialties?: string[];
  profileImage?: { url: string; publicId: string };
  galleryImages?: { url: string; publicId: string }[];
  experienceYears?: number;
  socialLinks?: { platform: string; url: string }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
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
    galleryImages: [cloudinaryImageSchema],
    experienceYears: { type: Number, default: 0, min: 0 },
    socialLinks: [
      new Schema(
        { platform: { type: String, required: true }, url: { type: String, required: true } },
        { _id: false }
      ),
    ],
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

djOperatorSchema.index({ isActive: 1, name: 1 });

export const DJOperator =
  (mongoose.models.DJOperator as mongoose.Model<IDJOperator>) ||
  mongoose.model<IDJOperator>('DJOperator', djOperatorSchema);
