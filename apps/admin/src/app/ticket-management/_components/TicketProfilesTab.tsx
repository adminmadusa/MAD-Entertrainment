'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import {
  adminGetTicketProfiles,
  adminDeleteTicketProfile,
  adminUpdateTicketProfile,
  adminBulkDeleteTicketProfiles,
  adminBulkUpdateTicketProfileStatus
} from '@/lib/api/admin/ticket-profile.service';
import { extractApiError } from '@/lib/api/client';
import { AdminRole } from '@mad/shared';
import type { TicketProfile } from '@mad/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ErrorState,
  Modal,
  FloatingActionBar,
  EmptyState,
  Checkbox,
  useBulkSelection
} from '@mad/ui';
import { Ticket } from '@mad/ui/icons';
import { formatDate } from '@mad/utils';

interface TabProps {
  canMutate: boolean;
  qc: ReturnType<typeof useQueryClient>;
  showToast: (msg: string) => void;
}

export function TicketProfilesTab({ canMutate, qc, showToast }: TabProps) {
  const [deleteTarget, setDeleteTarget] = useState<TicketProfile | null>(null);

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['admin-ticket-profiles'],
    queryFn: adminGetTicketProfiles,
  });

  const profileIds = profiles.map((p) => p._id);
  const { selectedIds, selectedCount, isSelected, toggle, selectAll, clearSelection, allSelected, indeterminate } = useBulkSelection({ pageIds: profileIds });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteTicketProfile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
      setDeleteTarget(null);
      showToast('Ticket profile deleted successfully');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUpdateTicketProfile(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
      showToast('Status updated successfully');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminBulkDeleteTicketProfiles(ids),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
      clearSelection();
      const { successCount, failedCount } = data;
      showToast(failedCount > 0 ? `Deleted ${successCount} profiles. ${failedCount} failed.` : `Deleted ${successCount} profiles successfully.`);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to bulk delete');
    }
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[], isActive: boolean }) => adminBulkUpdateTicketProfileStatus(ids, isActive),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
      clearSelection();
      const { successCount, failedCount } = data;
      const actionStr = variables.isActive ? 'Activated' : 'Deactivated';
      showToast(failedCount > 0 ? `${actionStr} ${successCount} profiles. ${failedCount} failed.` : `${actionStr} ${successCount} profiles successfully.`);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to update status');
    }
  });

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load ticket profiles.'} />
      </div>
    );
  }

  const getTicketsCount = (profile: TicketProfile) => {
    return profile.groups?.reduce((sum, group) => sum + (group.tickets?.length || 0), 0) || 0;
  };

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
          <TableCell colSpan={7} className="py-8">
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
        <TableCell className="w-12 px-4 text-center">
          <Checkbox
            checked={isSelected(profile._id)}
            onChange={() => toggle(profile._id)}
            aria-label={`Select ${profile.name}`}
          />
        </TableCell>
        <TableCell className="py-4 px-5">
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
          <span className="text-white bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10 font-mono text-xs">
            {profile.groups?.length || 0}
          </span>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary font-medium">
          <span className="text-accent-purple-light font-semibold font-mono text-xs">
            {getTicketsCount(profile)}
          </span>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary text-xs">
          {formatDate(profile.createdAt)}
        </TableCell>
        <TableCell className="py-4 px-4">
          {canMutate ? (
            <button
              onClick={() => toggleStatusMutation.mutate({ id: profile._id, isActive: !profile.isActive })}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                profile.isActive
                  ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
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
        <TableCell className="py-4 px-5">
          {canMutate ? (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/ticket-profiles/${profile._id}/edit`}
                className="px-3 py-1.5 text-xs font-semibold glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
              >
                Edit
              </Link>
              <button
                onClick={() => setDeleteTarget(profile)}
                className="px-3 py-1.5 text-xs font-semibold glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all"
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

  return (
    <div className="space-y-6">
      {/* Create Button Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-white font-bold text-lg">Reusable Ticket Profiles</h2>
          <p className="text-text-secondary text-xs mt-0.5">Profiles outline complete ticket groupings and restrictions</p>
        </div>
        {canMutate && (
          <Link
            href="/ticket-profiles/new"
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-[1.02] transition-transform flex items-center gap-1.5"
          >
            <span>+</span> Create Profile
          </Link>
        )}
      </div>

      {/* Table grid */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 px-4 text-center">
                <Checkbox
                  checked={allSelected}
                  indeterminate={indeterminate}
                  onChange={() => allSelected ? clearSelection() : selectAll()}
                  aria-label="Select all profiles"
                />
              </TableHead>
              <TableHead className="py-3.5 px-5">Profile Name & Description</TableHead>
              <TableHead className="py-3.5 px-4">Groups</TableHead>
              <TableHead className="py-3.5 px-4">Total Ticket Tiers</TableHead>
              <TableHead className="py-3.5 px-4">Created On</TableHead>
              <TableHead className="py-3.5 px-4">Status</TableHead>
              <TableHead className="py-3.5 px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>
      </div>

      {/* Reusable dialog modal */}
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
            <p className="text-error text-xs mb-5 font-semibold">This action cannot be undone.</p>
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

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
      >
        <button
          onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), isActive: true })}
          disabled={bulkStatusMutation.isPending || bulkDeleteMutation.isPending}
          className="px-3 py-1.5 text-sm font-medium text-white hover:text-green-400 bg-white/5 hover:bg-green-500/20 border border-transparent hover:border-green-500/30 rounded-lg transition-all"
        >
          {bulkStatusMutation.isPending ? 'Processing...' : 'Activate'}
        </button>
        <button
          onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), isActive: false })}
          disabled={bulkStatusMutation.isPending || bulkDeleteMutation.isPending}
          className="px-3 py-1.5 text-sm font-medium text-white hover:text-yellow-400 bg-white/5 hover:bg-yellow-500/20 border border-transparent hover:border-yellow-500/30 rounded-lg transition-all"
        >
          {bulkStatusMutation.isPending ? 'Processing...' : 'Deactivate'}
        </button>
        <div className="w-px h-4 bg-border-default mx-1" />
        <button
          onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
          disabled={bulkDeleteMutation.isPending || bulkStatusMutation.isPending}
          className="px-3 py-1.5 text-sm font-medium text-white hover:text-red-400 bg-white/5 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
        >
          {bulkDeleteMutation.isPending ? 'Processing...' : 'Delete'}
        </button>
      </FloatingActionBar>
    </div>
  );
}
