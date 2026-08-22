import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  googleId?: string;
  picture?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
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
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/missing values to avoid unique conflict for email-only users
      index: true,
    },
    picture: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = model<IUser>('User', userSchema);
