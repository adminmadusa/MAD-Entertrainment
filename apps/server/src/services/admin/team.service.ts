import bcrypt from 'bcryptjs';
import { AdminModel, IAdmin } from '../../models/admin.schema';
import { runInTransaction } from './booking.service';
import { auditLog } from '../../utils/audit';
import { AppError } from '../../middleware/error.middleware';

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

export const createAdmin = async (
  payload: Record<string, any>,
  requestingAdminId?: string,
  requestingAdminRole?: string
): Promise<IAdmin> => {
  const { email, password, name, role } = payload;

  if (!email || !password || !name || !role) {
    throw AppError.badRequest('All fields (email, password, name, role) are required');
  }

  const existing = await AdminModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw AppError.conflict('An administrator with this email already exists');
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

  // Log successful account creation
  auditLog({
    action: 'ADMIN_CREATED',
    actor: { type: 'admin', id: requestingAdminId || 'system' },
    status: 'success',
    metadata: {
      targetId: admin._id.toString(),
      targetRole: admin.role,
      targetEmail: admin.email,
      actorRole: requestingAdminRole || 'super_admin',
    },
    description: `Created administrative account for ${admin.email} with role ${admin.role}`,
  });

  // Return admin without passwordHash
  const adminObj = admin.toObject() as any;
  delete adminObj.passwordHash;
  return adminObj;
};

export const toggleAdminActive = async (
  id: string,
  requestingAdminId: string,
  requestingAdminRole: string
): Promise<IAdmin | null> => {
  // Service-level role hierarchy check (defense-in-depth safeguard)
  if (requestingAdminRole !== 'super_admin') {
    auditLog({
      action: 'ADMIN_MUTATION_DENIED',
      actor: { type: 'admin', id: requestingAdminId },
      status: 'failure',
      metadata: {
        targetId: id,
        actorRole: requestingAdminRole,
        reason: 'insufficient_privileges',
      },
      description: `Blocked attempt by non-super_admin ${requestingAdminId} to toggle status of admin ${id}`,
    });
    throw AppError.forbidden('Only Super Admins can manage administrative accounts');
  }

  // Self deactivation block
  if (id === requestingAdminId) {
    auditLog({
      action: 'ADMIN_MUTATION_DENIED',
      actor: { type: 'admin', id: requestingAdminId },
      status: 'failure',
      metadata: {
        targetId: id,
        actorRole: requestingAdminRole,
        reason: 'self_deactivation',
      },
      description: `Blocked self-deactivation attempt by ${requestingAdminId}`,
    });
    throw AppError.badRequest('You cannot deactivate your own administrative account');
  }

  return runInTransaction(async (session) => {
    const admin = await AdminModel.findById(id).session(session || null);
    if (!admin) {
      return null;
    }

    const targetRole = admin.role;
    const targetEmail = admin.email;

    // Last SUPER_ADMIN lockout protection guard
    if (admin.role === 'super_admin' && admin.isActive) {
      const activeSuperAdmins = await AdminModel.countDocuments({
        role: 'super_admin',
        isActive: true,
      }).session(session || null);

      if (activeSuperAdmins === 1) {
        auditLog({
          action: 'ADMIN_MUTATION_DENIED',
          actor: { type: 'admin', id: requestingAdminId },
          status: 'failure',
          metadata: {
            targetId: id,
            targetRole,
            targetEmail,
            actorRole: requestingAdminRole,
            reason: 'last_active_super_admin',
          },
          description: `Blocked attempt to deactivate the last active Super Admin (${targetEmail})`,
        });
        throw AppError.badRequest('Cannot deactivate the last active Super Admin account');
      }
    }

    // Toggle active status
    admin.isActive = !admin.isActive;
    await admin.save({ session: session || undefined });

    auditLog({
      action: admin.isActive ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
      actor: { type: 'admin', id: requestingAdminId },
      status: 'success',
      metadata: {
        targetId: id,
        targetRole,
        targetEmail,
        actorRole: requestingAdminRole,
        isActive: admin.isActive,
      },
      description: `${admin.isActive ? 'Activated' : 'Deactivated'} administrative account for ${targetEmail}`,
    });

    return admin;
  });
};
