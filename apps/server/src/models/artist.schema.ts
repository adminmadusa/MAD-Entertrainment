import mongoose, { Schema, Document } from "mongoose";

export interface IArtist extends Document {
  name: string;
  slug: string;
  bio?: string;
  genre?: string[];
  profileImage?: { url: string; publicId: string };
  socialLinks?: { platform: string; url: string }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
}

const cloudinaryImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const artistSchema = new Schema<IArtist>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    bio: { type: String, maxlength: 3000 },
    genre: [String],
    profileImage: cloudinaryImageSchema,
    socialLinks: [
      new Schema(
        {
          platform: { type: String, required: true },
          url: { type: String, required: true },
        },
        { _id: false },
      ),
    ],
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: true },
);

export const Artist =
  (mongoose.models.Artist as mongoose.Model<IArtist>) ||
  mongoose.model<IArtist>("Artist", artistSchema);
