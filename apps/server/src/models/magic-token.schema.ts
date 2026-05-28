import { Schema, model, Document } from 'mongoose';

export interface IMagicToken extends Document {
  email: string;
  token: string;
  otp: string;
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
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      index: true,
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
