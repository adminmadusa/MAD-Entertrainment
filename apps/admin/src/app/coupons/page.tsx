'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { adminGetCoupons, adminDeleteCoupon, adminToggleCoupon } from '@/lib/api/admin/coupon.service';
import { extractApiError } from '@/lib/api/client';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import type { Coupon } from '@mad/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ErrorState, Modal, EmptyState } from '@mad/ui';
import { Tag } from '@mad/ui/icons';
import { formatDate } from '@mad/utils';


export default function AdminCouponsPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const canMutateCoupons = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-coupons', page, activeFilter],
    queryFn: () => adminGetCoupons(page, 15, activeFilter || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteCoupon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      setDeleteTarget(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminToggleCoupon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const coupons = data?.items ?? [];
  const pagination = data?.pagination;

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-36" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></TableCell>
        </TableRow>
      ));
    }

    if (coupons.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={<Tag />}
              title="No coupons created yet."
              action={
                <Link href="/coupons/new" className="px-4 py-2 mt-2 text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl transition-colors">
                  Create Coupon
                </Link>
              }
            />
          </TableCell>
        </TableRow>
      );
    }

    return coupons.map((coupon) => (
      <TableRow key={coupon._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <TableCell className="py-4 px-5">
          <div>
            <span className="text-white font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-sm mr-2 select-all">
              {coupon.code}
            </span>
            {coupon.description && (
              <p className="text-text-muted text-xs mt-1.5 max-w-xs truncate">{coupon.description}</p>
            )}
          </div>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary font-medium">
          {coupon.discountType === 'percentage' ? (
            <span className="text-accent-purple font-semibold">{coupon.discountValue}% Off</span>
          ) : (
            <span className="text-emerald-400 font-semibold">₹{coupon.discountValue} Off</span>
          )}
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary">
          <span className="text-text-primary font-semibold">{coupon.usedCount}</span> / {coupon.usageLimit}
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary text-xs">
          <div>{formatDate(coupon.validFrom)}</div>
          <div className="text-text-muted mt-0.5">to {formatDate(coupon.validUntil)}</div>
        </TableCell>
        <TableCell className="py-4 px-4">
          {canMutateCoupons ? (
            <button
              onClick={() => toggleMutation.mutate(coupon._id)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                coupon.isActive
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              {coupon.isActive ? 'Active' : 'Inactive'}
            </button>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              coupon.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {coupon.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </TableCell>
        <TableCell className="py-4 px-5">
          {canMutateCoupons ? (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/coupons/${coupon._id}/edit`}
                className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
              >
                Edit
              </Link>
              <button
                onClick={() => setDeleteTarget(coupon)}
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
        <ErrorState message={(error as Error).message || 'Failed to load coupons.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Coupons</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {pagination?.total ?? 0} discount coupons total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white/5 border border-border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-accent-purple/50"
          >
            <option value="" className="bg-black">All Statuses</option>
            <option value="true" className="bg-black">Active Only</option>
            <option value="false" className="bg-black">Inactive Only</option>
          </select>
          {canMutateCoupons && (
            <Link
              href="/coupons/new"
              id="admin-create-coupon"
              className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
            >
              <span>+</span> Create Coupon
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3.5 px-5">Code & Description</TableHead>
              <TableHead className="py-3.5 px-4">Discount</TableHead>
              <TableHead className="py-3.5 px-4">Usage Limit</TableHead>
              <TableHead className="py-3.5 px-4">Validity Period</TableHead>
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
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} coupons
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
        ariaLabelledBy="delete-coupon-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-sm"
      >
        {deleteTarget && (
          <div>
            <h2 id="delete-coupon-modal-title" className="text-white font-bold text-lg mb-2">Delete Coupon?</h2>
            <p className="text-text-secondary text-sm mb-1">
              Coupon code <strong className="text-white font-mono">{deleteTarget.code}</strong> will be permanently deleted.
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
