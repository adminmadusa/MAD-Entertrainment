'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { adminGetPopups, adminDeletePopup, adminTogglePopup } from '@/lib/api/admin/popup.service';
import { extractApiError } from '@/lib/api/client';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import type { PopupCampaign } from '@mad/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ErrorState, Modal, EmptyState } from '@mad/ui';
import { Globe } from '@mad/ui/icons';


export default function AdminPopupsPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const canMutatePopups = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole);
  const [deleteTarget, setDeleteTarget] = useState<PopupCampaign | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-popups', page],
    queryFn: () => adminGetPopups(page, 15),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeletePopup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-popups'] });
      setDeleteTarget(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminTogglePopup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-popups'] }),
  });

  const popups = data?.items ?? [];
  const pagination = data?.pagination;

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-28" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-12" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></TableCell>
        </TableRow>
      ));
    }

    if (popups.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={<Globe />}
              title="No popup campaigns created yet."
              action={
                <Link href="/popups/new" className="px-4 py-2 mt-2 text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl transition-colors">
                  Create Popup
                </Link>
              }
            />
          </TableCell>
        </TableRow>
      );
    }

    return popups.map((popup) => (
      <TableRow key={popup._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <TableCell className="py-4 px-5">
          <div className="flex items-center gap-3">
            {popup.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={popup.image.url} alt={popup.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex-shrink-0 flex items-center justify-center text-accent-purple text-xs font-bold">
                💬
              </div>
            )}
            <div className="min-w-0">
              <p className="text-text-primary font-medium truncate max-w-52">{popup.name}</p>
              <p className="text-text-muted text-xs truncate">{popup.title}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary capitalize">
          {popup.trigger.replace('_', ' ')}
          {popup.triggerDelay ? ` (${popup.triggerDelay / 1000}s)` : ''}
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary">
          {popup.cooldownHours}h
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary font-semibold">
          {popup.priority}
        </TableCell>
        <TableCell className="py-4 px-4">
          {canMutatePopups ? (
            <button
              onClick={() => toggleMutation.mutate(popup._id)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                popup.isActive
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              {popup.isActive ? 'Active' : 'Inactive'}
            </button>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              popup.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {popup.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </TableCell>
        <TableCell className="py-4 px-5">
          {canMutatePopups ? (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/popups/${popup._id}/edit`}
                className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
              >
                Edit
              </Link>
              <button
                onClick={() => setDeleteTarget(popup)}
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

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load popup campaigns.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Popup Campaigns</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {pagination?.total ?? 0} campaigns total
          </p>
        </div>
        {canMutatePopups && (
          <Link
            href="/popups/new"
            id="admin-create-popup"
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
          >
            <span>+</span> Create Campaign
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3.5 px-5">Campaign</TableHead>
              <TableHead className="py-3.5 px-4">Trigger</TableHead>
              <TableHead className="py-3.5 px-4">Cooldown</TableHead>
              <TableHead className="py-3.5 px-4">Priority</TableHead>
              <TableHead className="py-3.5 px-4">Status</TableHead>
              <TableHead className="py-3.5 px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} campaigns
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

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        showCloseButton={false}
        closeOnBackdropClick={true}
        ariaLabelledBy="delete-popup-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-sm"
      >
        {deleteTarget && (
          <div>
            <h2 id="delete-popup-modal-title" className="text-white font-bold text-lg mb-2">Delete Popup?</h2>
            <p className="text-text-secondary text-sm mb-1">
              <strong className="text-white">{deleteTarget.name}</strong> will be permanently deleted.
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
