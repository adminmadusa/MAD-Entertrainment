import { Schema, model, Document } from 'mongoose';

export interface IMagicToken extends Document {
  email: string;
  otp: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const magicTokenSchema = new Schema<IMagicToken>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    otp: {
      type: String,
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index auto-deletes the document when expiresAt is reached
    },
  },
  {
    timestamps: true,
  }
);

export const MagicTokenModel = model<IMagicToken>('MagicToken', magicTokenSchema);
