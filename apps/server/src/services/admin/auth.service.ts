import jwt from 'jsonwebtoken';
import { AdminModel } from '../../models/admin.schema';
import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';

const env = getEnv();

export const adminAuthService = {
  async login(email: string, password: string) {
    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!admin.isActive) {
      throw AppError.forbidden('Account has been deactivated');
    }

    admin.lastLogin = new Date();
    await admin.save();

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
      throw AppError.notFound('Admin not found');
    }
    return {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  },
};
