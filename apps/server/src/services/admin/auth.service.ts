import { AdminModel } from '../../models/admin.schema';
import { AppError } from '../../middleware/error.middleware';
import { signAdminToken } from '../../utils/jwt';
import { AdminRole } from '@mad/shared';

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

    const token = signAdminToken({
      sub: admin._id.toString(),
      email: admin.email,
      role: admin.role as AdminRole,
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
