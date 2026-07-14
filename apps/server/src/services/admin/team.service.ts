import bcrypt from 'bcryptjs';

import { AppError } from '../../middleware/error.middleware';
import { AdminModel, IAdmin } from '../../models/admin.schema';
import { auditLog } from '../../utils/audit';
import { runInTransaction } from '../../utils/transaction';

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
  // Service-level role hierarchy check (defense-in-depth safeguard)
  if (requestingAdminRole !== 'super_admin') {
    auditLog({
      action: 'ADMIN_MUTATION_DENIED',
      actor: { type: 'admin', id: requestingAdminId || 'system' },
      status: 'failure',
      metadata: {
        actorRole: requestingAdminRole,
        reason: 'insufficient_privileges',
        actionAttempted: 'create_admin',
      },
      description: `Blocked attempt by non-super_admin ${requestingAdminId || 'system'} to create administrative account`,
    });
    throw AppError.forbidden('Only Super Admins can manage administrative accounts');
  }

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
      actorRole: requestingAdminRole,
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

export const updateAdmin = async (
  id: string,
  payload: Record<string, any>,
  requestingAdminId: string,
  requestingAdminRole: string
): Promise<IAdmin | null> => {
  if (requestingAdminRole !== 'super_admin') {
    throw AppError.forbidden('Only Super Admins can manage administrative accounts');
  }

  const { name, email } = payload;
  if (!name || !email) {
    throw AppError.badRequest('Name and email are required');
  }

  return runInTransaction(async (session) => {
    const admin = await AdminModel.findById(id).session(session || null);
    if (!admin) {
      return null;
    }

    if (id === requestingAdminId && email.toLowerCase() !== admin.email.toLowerCase()) {
      throw AppError.badRequest('You cannot edit your own email address through the administrative panel.');
    }

    if (email.toLowerCase() !== admin.email.toLowerCase()) {
      const existing = await AdminModel.findOne({ email: email.toLowerCase() }).session(session || null);
      if (existing) {
        throw AppError.conflict('An administrator with this email already exists');
      }
    }

    const before = { name: admin.name, email: admin.email };
    admin.name = name;
    admin.email = email.toLowerCase();
    await admin.save({ session: session || undefined });

    auditLog({
      action: 'ADMIN_UPDATED',
      actor: { type: 'admin', id: requestingAdminId },
      status: 'success',
      metadata: {
        targetId: id,
        before,
        after: { name: admin.name, email: admin.email },
      },
      description: `Updated administrative account details for ${admin.email}`,
    });

    const adminObj = admin.toObject() as any;
    delete adminObj.passwordHash;
    return adminObj;
  });
};

export const updateAdminRole = async (
  id: string,
  newRole: string,
  requestingAdminId: string,
  requestingAdminRole: string
): Promise<IAdmin | null> => {
  if (requestingAdminRole !== 'super_admin') {
    throw AppError.forbidden('Only Super Admins can manage administrative accounts');
  }

  if (id === requestingAdminId) {
    throw AppError.badRequest('You cannot modify your own administrative role');
  }

  return runInTransaction(async (session) => {
    const admin = await AdminModel.findById(id).session(session || null);
    if (!admin) {
      return null;
    }

    const oldRole = admin.role;
    if (oldRole === newRole) {
      throw AppError.badRequest('Role is already assigned');
    }

    if (oldRole === 'super_admin' && admin.isActive && newRole !== 'super_admin') {
      const activeSuperAdmins = await AdminModel.countDocuments({
        role: 'super_admin',
        isActive: true,
      }).session(session || null);

      if (activeSuperAdmins === 1) {
        throw AppError.badRequest('Cannot downgrade the last active Super Admin account');
      }
    }

    admin.role = newRole;
    await admin.save({ session: session || undefined });

    auditLog({
      action: 'ADMIN_ROLE_CHANGED',
      actor: { type: 'admin', id: requestingAdminId },
      status: 'success',
      metadata: {
        targetId: id,
        oldRole,
        newRole,
      },
      description: `Changed role of ${admin.email} from ${oldRole} to ${newRole}`,
    });

    const adminObj = admin.toObject() as any;
    delete adminObj.passwordHash;
    return adminObj;
  });
};

export const resetAdminPassword = async (
  id: string,
  payload: Record<string, any>,
  requestingAdminId: string,
  requestingAdminRole: string
): Promise<IAdmin | null> => {
  if (requestingAdminRole !== 'super_admin') {
    throw AppError.forbidden('Only Super Admins can manage administrative accounts');
  }

  if (id === requestingAdminId) {
    throw AppError.badRequest('You cannot reset your own password using the administrator lifecycle API. Please use the account settings page instead.');
  }

  const { password } = payload;
  if (!password) {
    throw AppError.badRequest('Password is required');
  }

  return runInTransaction(async (session) => {
    const admin = await AdminModel.findById(id).session(session || null);
    if (!admin) {
      return null;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    admin.passwordHash = passwordHash;
    admin.passwordVersion = (admin.passwordVersion || 0) + 1;
    await admin.save({ session: session || undefined });

    auditLog({
      action: 'ADMIN_PASSWORD_RESET',
      actor: { type: 'admin', id: requestingAdminId },
      status: 'success',
      metadata: {
        targetId: id,
      },
      description: `Reset password and invalidated sessions for administrative account ${admin.email}`,
    });

    const adminObj = admin.toObject() as any;
    delete adminObj.passwordHash;
    return adminObj;
  });
};
