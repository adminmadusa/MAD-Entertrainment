import bcrypt from 'bcryptjs';
import { AdminModel, IAdmin } from '../../models/admin.schema';

export const getAdmins = async (
  page: number = 1,
  limit: number = 15
): Promise<{ admins: IAdmin[]; total: number; totalPages: number }> => {
  const skip = (page - 1) * limit;

  const total = await AdminModel.countDocuments();
  const admins = await AdminModel.find()
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    admins,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const createAdmin = async (payload: Record<string, any>): Promise<IAdmin> => {
  const { email, password, name, role } = payload;

  if (!email || !password || !name || !role) {
    throw new Error('All fields (email, password, name, role) are required');
  }

  const existing = await AdminModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new Error('An administrator with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = new AdminModel({
    email,
    passwordHash,
    name,
    role,
    isActive: true,
  });

  await admin.save();

  // Return admin without passwordHash
  const adminObj = admin.toObject() as any;
  delete adminObj.passwordHash;
  return adminObj;
};

export const toggleAdminActive = async (
  id: string,
  requestingAdminId: string
): Promise<IAdmin | null> => {
  if (id === requestingAdminId) {
    throw new Error('You cannot deactivate your own administrative account');
  }

  const admin = await AdminModel.findById(id);
  if (!admin) {
    return null;
  }

  admin.isActive = !admin.isActive;
  await admin.save();
  return admin;
};
