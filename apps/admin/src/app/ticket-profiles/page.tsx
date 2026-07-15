'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import { adminGetTicketProfiles, adminDeleteTicketProfile, adminUpdateTicketProfile } from '@/lib/api/admin/ticket-profile.service';
import { extractApiError } from '@/lib/api/client';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import type { TicketProfile } from '@mad/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ErrorState, Modal, EmptyState } from '@mad/ui';
import { Ticket } from '@mad/ui/icons';
import { formatDate } from '@mad/utils';

export default function AdminTicketProfilesPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<TicketProfile | null>(null);
  const canMutateProfiles = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole);

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['admin-ticket-profiles'],
    queryFn: adminGetTicketProfiles,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteTicketProfile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
      setDeleteTarget(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUpdateTicketProfile(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
    },
  });

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load ticket profiles.'} />
      </div>
    );
  }

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-12" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></TableCell>
        </TableRow>
      ));
    }

    if (profiles.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={<Ticket />}
              title="No ticket profiles created yet."
              action={
                <Link href="/ticket-profiles/new" className="px-4 py-2 mt-2 text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl transition-colors">
                  Create Ticket Profile
                </Link>
              }
            />
          </TableCell>
        </TableRow>
      );
    }

    return profiles.map((profile) => (
      <TableRow key={profile._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <TableCell sticky="start" showStickyDivider className="py-4 px-5">
          <div>
            <span className="text-white font-bold text-sm block">
              {profile.name}
            </span>
            {profile.description && (
              <p className="text-text-muted text-xs mt-1 max-w-xs truncate">{profile.description}</p>
            )}
          </div>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary font-medium">
          <span className="text-white bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10 font-mono">
            {profile.groups?.length || 0}
          </span>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary font-medium">
          <span className="text-accent-purple-light font-semibold font-mono">
            {getTicketsCount(profile)}
          </span>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary text-xs">
          {formatDate(profile.createdAt)}
        </TableCell>
        <TableCell className="py-4 px-4">
          {canMutateProfiles ? (
            <button
              onClick={() => toggleStatusMutation.mutate({ id: profile._id, isActive: !profile.isActive })}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                profile.isActive
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              {profile.isActive ? 'Active' : 'Inactive'}
            </button>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              profile.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {profile.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </TableCell>
        <TableCell sticky="end" showStickyDivider className="py-4 px-5">
          {canMutateProfiles ? (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/ticket-profiles/${profile._id}/edit`}
                className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
              >
                Edit
              </Link>
              <button
                onClick={() => setDeleteTarget(profile)}
                className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="text-right text-text-muted">—</div>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  const getTicketsCount = (profile: TicketProfile) => {
    return profile.groups?.reduce((sum, group) => sum + (group.tickets?.length || 0), 0) || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Ticket Profiles</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {profiles.length} reusable ticketing profiles total
          </p>
        </div>
        {canMutateProfiles && (
          <Link
            href="/ticket-profiles/new"
            id="admin-create-ticket-profile"
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
          >
            <span>+</span> Create Profile
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader stickyHeader>
            <TableRow>
              <TableHead sticky="start" showStickyDivider className="py-3.5 px-5">Profile Name & Description</TableHead>
              <TableHead className="py-3.5 px-4">Groups</TableHead>
              <TableHead className="py-3.5 px-4">Total Ticket Tiers</TableHead>
              <TableHead className="py-3.5 px-4">Created On</TableHead>
              <TableHead className="py-3.5 px-4">Status</TableHead>
              <TableHead sticky="end" showStickyDivider className="py-3.5 px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        showCloseButton={false}
        closeOnBackdropClick={true}
        ariaLabelledBy="delete-profile-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-sm"
      >
        {deleteTarget && (
          <div>
            <h2 id="delete-profile-modal-title" className="text-white font-bold text-lg mb-2">Delete Ticket Profile?</h2>
            <p className="text-text-secondary text-sm mb-1">
              Profile <strong className="text-white">{deleteTarget.name}</strong> will be permanently deleted.
            </p>
            <p className="text-error text-xs mb-5">This action cannot be undone.</p>
            {deleteMutation.error && (
              <p className="text-red-400 text-xs mb-3">{extractApiError(deleteMutation.error).message}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
