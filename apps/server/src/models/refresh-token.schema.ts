import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId?: Types.ObjectId;
  adminId?: Types.ObjectId;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index to auto-delete documents when expiresAt is reached
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    replacedByToken: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const RefreshTokenModel = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
