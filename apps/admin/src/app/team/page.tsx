'use client';

import { AdminRole } from '@mad/shared';
import { Admin } from '@mad/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import { adminGetAdmins, adminCreateAdmin, adminToggleAdminActive, adminUpdateAdmin, adminUpdateAdminRole, adminResetAdminPassword } from '@/lib/api/admin/team.service';
import { adminApiClient, extractApiError } from '@/lib/api/client';
import ErrorState from '@/components/states/ErrorState';
import LoadingState from '@/components/states/LoadingState';
import { useAdminAuth } from '@/hooks/use-admin-auth.hook';


const ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'Super Admin',
  [AdminRole.ADMIN]: 'Admin',
  [AdminRole.MANAGER]: 'Manager',
  [AdminRole.SUPPORT]: 'Support',
  [AdminRole.SCANNER]: 'Scanner',
};

const ROLE_BADGE_STYLES: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple',
  [AdminRole.ADMIN]: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  [AdminRole.MANAGER]: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  [AdminRole.SUPPORT]: 'bg-green-500/10 border-green-500/30 text-green-400',
  [AdminRole.SCANNER]: 'bg-white/5 border-white/10 text-text-secondary',
};

export default function AdminTeamPage() {
  const qc = useQueryClient();
  const { admin: currentAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const [page, setPage] = useState(1);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invite states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(AdminRole.ADMIN);
  const [inviteError, setInviteError] = useState('');

  // Edit states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Admin | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState('');

  // Change Role states
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<Admin | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole>(AdminRole.ADMIN);
  const [roleError, setRoleError] = useState('');

  // Reset Password states
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Admin | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Fetch logged in admin to prevent deactivating self
  const { data: meProfile } = useQuery({
    queryKey: ['admin-profile-me'],
    queryFn: async () => {
      const { data } = await adminApiClient.get<{ data: { admin: Admin } }>('/admin/auth/me');
      return data.data.admin;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-team', page],
    queryFn: () => adminGetAdmins(page, 15),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminToggleAdminActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-team'] }),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminCreateAdmin(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team'] });
      setIsInviteOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole(AdminRole.ADMIN);
      setInviteError('');
    },
    onError: (err) => setInviteError(extractApiError(err).message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; email: string } }) => adminUpdateAdmin(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team'] });
      setIsEditOpen(false);
      setEditTarget(null);
      setEditName('');
      setEditEmail('');
      setEditError('');
    },
    onError: (err) => setEditError(extractApiError(err).message),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminUpdateAdminRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team'] });
      setIsRoleOpen(false);
      setRoleTarget(null);
      setRoleError('');
    },
    onError: (err) => setRoleError(extractApiError(err).message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminResetAdminPassword(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team'] });
      setIsResetPasswordOpen(false);
      setResetTarget(null);
      setNewPassword('');
      setConfirmPassword('');
      setResetPasswordError('');
      setShowResetPassword(false);
    },
    onError: (err) => setResetPasswordError(extractApiError(err).message),
  });

  // ─── Route Protection Guard ──────────────────────────────────
  if (isAuthLoading) {
    return <LoadingState />;
  }

  if (!currentAdmin || currentAdmin.role !== 'super_admin') {
    return (
      <div className="py-12">
        <ErrorState message="Access Denied: Only Super Admins are permitted to manage administrative accounts." />
      </div>
    );
  }

  const admins = data?.items ?? [];
  const pagination = data?.pagination;

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <tr key={i} className="border-b border-border-subtle/50 animate-pulse">
          <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></td>
          <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
          <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
          <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
          <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
          <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-12 ml-auto" /></td>
        </tr>
      ));
    }

    if (admins.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-16 text-center text-text-muted">
            No admin users registered.
          </td>
        </tr>
      );
    }

    return admins.map((admin) => (
      <tr key={admin._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <td className="py-4 px-5">
          <div>
            <p className="text-text-primary font-medium">{admin.name}</p>
            <p className="text-text-muted text-xs">{admin.email}</p>
          </div>
        </td>
        <td className="py-4 px-4">
          <span className={`text-xs px-2 py-0.5 rounded font-medium border ${ROLE_BADGE_STYLES[admin.role as AdminRole] || ROLE_BADGE_STYLES[AdminRole.ADMIN]}`}>
            {ROLE_LABELS[admin.role as AdminRole] || admin.role}
          </span>
        </td>
        <td className="py-4 px-4 text-text-secondary whitespace-nowrap">
          {admin.createdAt
            ? new Date(admin.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
        </td>
        <td className="py-4 px-4 text-text-secondary whitespace-nowrap">
          {admin.lastLogin
            ? new Date(admin.lastLogin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : 'Invited • Awaiting First Login'}
        </td>
        <td className="py-4 px-4">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
            admin.isActive
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {admin.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="py-4 px-5">
          <div className="flex items-center justify-end gap-2">
            {currentAdmin?.role === 'super_admin' ? (
              <>
                <button
                  onClick={() => {
                    setEditTarget(admin);
                    setEditName(admin.name);
                    setEditEmail(admin.email);
                    setEditError('');
                    setIsEditOpen(true);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setRoleTarget(admin);
                    setSelectedRole(admin.role as AdminRole);
                    setRoleError('');
                    setIsRoleOpen(true);
                  }}
                  disabled={meProfile && meProfile._id === admin._id}
                  className="px-2.5 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={meProfile && meProfile._id === admin._id ? 'You cannot modify your own role' : undefined}
                >
                  Role
                </button>
                <button
                  onClick={() => {
                    setResetTarget(admin);
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetPasswordError('');
                    setShowResetPassword(false);
                    setIsResetPasswordOpen(true);
                  }}
                  disabled={meProfile && meProfile._id === admin._id}
                  className="px-2.5 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={meProfile && meProfile._id === admin._id ? 'Use account settings to change your password' : undefined}
                >
                  Reset
                </button>
                {meProfile && meProfile._id !== admin._id ? (
                  <button
                    onClick={() => toggleMutation.mutate(admin._id)}
                    disabled={toggleMutation.isPending}
                    className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                      admin.isActive
                        ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                    }`}
                  >
                    {admin.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                ) : (
                  <span className="text-text-muted text-xs italic px-2 py-1.5">Self</span>
                )}
              </>
            ) : (
              <span className="text-text-muted text-xs">—</span>
            )}
          </div>
        </td>
      </tr>
    ));
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load team members.'} />
      </div>
    );
  }

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');

    if (!name.trim() || !email.trim() || !password) {
      setInviteError('All fields are required.');
      return;
    }

    inviteMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Admin Users</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Manage administrative and back-office personnel
          </p>
        </div>
        {currentAdmin?.role === 'super_admin' && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
          >
            <span>+</span> Invite Member
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-text-muted font-medium py-3.5 px-5">Member</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Role</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Created</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Last Active</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Status</th>
                <th className="text-right text-text-muted font-medium py-3.5 px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {renderTableBody()}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} members
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <AnimatePresence>
        {isInviteOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
            >
              <div>
                <h3 className="text-white font-bold text-lg">Invite Admin User</h3>
                <p className="text-text-muted text-xs">Assign access credentials and roles</p>
              </div>

              {inviteError && (
                <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
                  {inviteError}
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Full Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@madentertrainment.com"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Access Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters, complex"
                    required
                    className={inputCls}
                  />
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    Must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special character.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Dashboard Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AdminRole)}
                    className={inputCls}
                  >
                    <option value={AdminRole.SUPER_ADMIN} className="bg-background-card">Super Admin</option>
                    <option value={AdminRole.ADMIN} className="bg-background-card">Admin</option>
                    <option value={AdminRole.MANAGER} className="bg-background-card">Manager</option>
                    <option value={AdminRole.SUPPORT} className="bg-background-card">Support</option>
                    <option value={AdminRole.SCANNER} className="bg-background-card">Scanner</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteOpen(false);
                      setInviteError('');
                    }}
                    className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
                  >
                    {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {isEditOpen && editTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
            >
              <div>
                <h3 className="text-white font-bold text-lg">Edit Admin Details</h3>
                <p className="text-text-muted text-xs">Update administrator profile information</p>
              </div>

              {editError && (
                <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
                  {editError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editName.trim() || !editEmail.trim()) {
                    setEditError('All fields are required.');
                    return;
                  }
                  editMutation.mutate({
                    id: editTarget._id,
                    payload: { name: editName.trim(), email: editEmail.trim() },
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Full Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    disabled={meProfile && meProfile._id === editTarget._id}
                    title={meProfile && meProfile._id === editTarget._id ? 'You cannot edit your own email address' : undefined}
                    className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  {meProfile && meProfile._id === editTarget._id && (
                    <p className="text-[10px] text-yellow-400">
                      Self-email modification is disabled to prevent session mismatch.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditTarget(null);
                      setEditError('');
                    }}
                    className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editMutation.isPending}
                    className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
                  >
                    {editMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Role Modal */}
      <AnimatePresence>
        {isRoleOpen && roleTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
            >
              <div>
                <h3 className="text-white font-bold text-lg">Change Admin Role</h3>
                <p className="text-text-muted text-xs">Update dashboard permissions for <strong className="text-white">{roleTarget.name}</strong></p>
              </div>

              {roleError && (
                <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
                  {roleError}
                </div>
              )}

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-400">
                Changing this role will immediately affect permissions.
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  changeRoleMutation.mutate({
                    id: roleTarget._id,
                    role: selectedRole,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Dashboard Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                    className={inputCls}
                  >
                    <option value={AdminRole.SUPER_ADMIN} className="bg-background-card">Super Admin</option>
                    <option value={AdminRole.ADMIN} className="bg-background-card">Admin</option>
                    <option value={AdminRole.MANAGER} className="bg-background-card">Manager</option>
                    <option value={AdminRole.SUPPORT} className="bg-background-card">Support</option>
                    <option value={AdminRole.SCANNER} className="bg-background-card">Scanner</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleOpen(false);
                      setRoleTarget(null);
                      setRoleError('');
                    }}
                    className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changeRoleMutation.isPending || selectedRole === roleTarget.role}
                    className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
                  >
                    {changeRoleMutation.isPending ? 'Saving...' : 'Save Role'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {isResetPasswordOpen && resetTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
            >
              <div>
                <h3 className="text-white font-bold text-lg">Reset Password</h3>
                <p className="text-text-muted text-xs">Assign a new complex access password for <strong className="text-white">{resetTarget.name}</strong></p>
              </div>

              {resetPasswordError && (
                <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
                  {resetPasswordError}
                </div>
              )}

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                Resetting the password will immediately invalidate all active sessions for this administrator.
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newPassword || !confirmPassword) {
                    setResetPasswordError('All fields are required.');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setResetPasswordError('Passwords do not match.');
                    return;
                  }
                  resetPasswordMutation.mutate({
                    id: resetTarget._id,
                    payload: { password: newPassword },
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">New Password</label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters, complex"
                      required
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3.5 top-3 text-text-muted hover:text-white text-xs font-semibold"
                    >
                      {showResetPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    Must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special character.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Confirm New Password</label>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPasswordOpen(false);
                      setResetTarget(null);
                      setResetPasswordError('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowResetPassword(false);
                    }}
                    className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetPasswordMutation.isPending}
                    className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
                  >
                    {resetPasswordMutation.isPending ? 'Resetting...' : 'Confirm Reset'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';
