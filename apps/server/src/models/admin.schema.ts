import bcrypt from 'bcryptjs';
import { Schema, model, Document } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  isActive: boolean;
  passwordVersion: number;
  lastLogin?: Date;
  comparePassword(password: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'manager', 'support', 'scanner'],
      default: 'admin',
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    passwordVersion: {
      type: Number,
      default: 0,
      required: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export const AdminModel = model<IAdmin>('Admin', adminSchema);
