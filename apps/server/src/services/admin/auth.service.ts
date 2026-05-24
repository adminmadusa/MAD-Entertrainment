import jwt from 'jsonwebtoken';
import { AdminModel } from '../../models/admin.schema';
import { getEnv } from '../../config/env';

const env = getEnv();

export const adminAuthService = {
  async login(email: string, password: string) {
    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const payload = {
      id: admin._id,
      role: admin.role,
    };

    const token = jwt.sign(payload, env.JWT_ADMIN_SECRET || env.JWT_SECRET, {
      expiresIn: (env.JWT_ADMIN_EXPIRES_IN || '1d') as any,
    });

    return {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  },

  async getMe(adminId: string) {
    const admin = await AdminModel.findById(adminId).select('-passwordHash');
    if (!admin) {
      throw new Error('Admin not found');
    }
    return {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  },
};
