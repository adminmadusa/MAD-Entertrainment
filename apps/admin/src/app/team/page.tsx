'use client';

import { AdminRole } from '@mad/shared';
import { Admin } from '@mad/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import {
  adminCreateAdmin,
  adminGetAdmins,
  adminResetAdminPassword,
  adminToggleAdminActive,
  adminUpdateAdmin,
  adminUpdateAdminRole,
} from '@/lib/api/admin/team.service';
import { adminApiClient, extractApiError } from '@/lib/api/client';
import ErrorState from '@/components/states/ErrorState';
import LoadingState from '@/components/states/LoadingState';
import { useAdminAuth } from '@/providers/AdminAuthProvider';

import ChangeRoleModal from './_components/ChangeRoleModal';
import EditAdminModal from './_components/EditAdminModal';
import InviteAdminModal from './_components/InviteAdminModal';
import ResetPasswordModal from './_components/ResetPasswordModal';
import TeamTable from './_components/TeamTable';

export default function AdminTeamPage() {
  const qc = useQueryClient();
  const { admin: currentAdmin, isLoading: isAuthLoading } = useAdminAuth();

  // Pagination
  const [page, setPage] = useState(1);

  // Modal open/close + target state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Admin | null>(null);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<Admin | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Admin | null>(null);

  // Server-side mutation errors (passed as props to modals)
  const [inviteServerError, setInviteServerError] = useState('');
  const [editServerError, setEditServerError] = useState('');
  const [roleServerError, setRoleServerError] = useState('');
  const [resetServerError, setResetServerError] = useState('');

  // Fetch logged in admin to prevent self-modification (meProfile._id, not currentAdmin.id)
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
      setInviteServerError('');
    },
    onError: (err) => setInviteServerError(extractApiError(err).message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; email: string } }) =>
      adminUpdateAdmin(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team'] });
      setIsEditOpen(false);
      setEditTarget(null);
      setEditServerError('');
    },
    onError: (err) => setEditServerError(extractApiError(err).message),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminUpdateAdminRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team'] });
      setIsRoleOpen(false);
      setRoleTarget(null);
      setRoleServerError('');
    },
    onError: (err) => setRoleServerError(extractApiError(err).message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminResetAdminPassword(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-team'] });
      setIsResetPasswordOpen(false);
      setResetTarget(null);
      setResetServerError('');
    },
    onError: (err) => setResetServerError(extractApiError(err).message),
  });

  // ─── Route Protection Guard ──────────────────────────────────
  if (isAuthLoading) {
    return <LoadingState />;
  }

  if (!currentAdmin || currentAdmin.role !== AdminRole.SUPER_ADMIN) {
    return (
      <div className="py-12">
        <ErrorState message="Access Denied: Only Super Admins are permitted to manage administrative accounts." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load team members.'} />
      </div>
    );
  }

  const admins = data?.items ?? [];
  const pagination = data?.pagination;

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
        {currentAdmin?.role === AdminRole.SUPER_ADMIN && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
          >
            <span>+</span> Invite Member
          </button>
        )}
      </div>

      {/* Team Table */}
      <TeamTable
        admins={admins}
        isLoading={isLoading}
        pagination={pagination}
        page={page}
        currentAdmin={currentAdmin}
        meProfileId={meProfile?._id}
        onPageChange={setPage}
        onToggle={(id) => toggleMutation.mutate(id)}
        toggleIsPending={toggleMutation.isPending}
        onOpenEdit={(admin) => {
          setEditTarget(admin);
          setEditServerError('');
          setIsEditOpen(true);
        }}
        onOpenRole={(admin) => {
          setRoleTarget(admin);
          setRoleServerError('');
          setIsRoleOpen(true);
        }}
        onOpenReset={(admin) => {
          setResetTarget(admin);
          setResetServerError('');
          setIsResetPasswordOpen(true);
        }}
      />

      {/* Invite Member Modal */}
      <AnimatePresence>
        {isInviteOpen && (
          <InviteAdminModal
            isOpen={isInviteOpen}
            onClose={() => {
              setIsInviteOpen(false);
              setInviteServerError('');
            }}
            onSubmit={(payload) => inviteMutation.mutate(payload)}
            isPending={inviteMutation.isPending}
            serverError={inviteServerError}
          />
        )}
      </AnimatePresence>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {isEditOpen && editTarget && (
          <EditAdminModal
            key={editTarget._id}
            target={editTarget}
            meProfileId={meProfile?._id}
            onClose={() => {
              setIsEditOpen(false);
              setEditTarget(null);
              setEditServerError('');
            }}
            onSubmit={(id, payload) => editMutation.mutate({ id, payload })}
            isPending={editMutation.isPending}
            serverError={editServerError}
          />
        )}
      </AnimatePresence>

      {/* Change Role Modal */}
      <AnimatePresence>
        {isRoleOpen && roleTarget && (
          <ChangeRoleModal
            key={roleTarget._id}
            target={roleTarget}
            onClose={() => {
              setIsRoleOpen(false);
              setRoleTarget(null);
              setRoleServerError('');
            }}
            onSubmit={(id, role) => changeRoleMutation.mutate({ id, role })}
            isPending={changeRoleMutation.isPending}
            serverError={roleServerError}
          />
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {isResetPasswordOpen && resetTarget && (
          <ResetPasswordModal
            key={resetTarget._id}
            target={resetTarget}
            onClose={() => {
              setIsResetPasswordOpen(false);
              setResetTarget(null);
              setResetServerError('');
            }}
            onSubmit={(id, payload) => resetPasswordMutation.mutate({ id, payload })}
            isPending={resetPasswordMutation.isPending}
            serverError={resetServerError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
