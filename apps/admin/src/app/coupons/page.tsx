'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { adminGetCoupons, adminDeleteCoupon, adminToggleCoupon } from '@/lib/api/admin/coupon.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import type { Coupon } from '@mad/types';
import { ErrorState } from '@mad/ui';

import { CouponsTable } from './_components/CouponsTable';
import { DeleteCouponModal } from './_components/DeleteCouponModal';

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

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load coupons.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <CouponsTable
        coupons={coupons}
        isLoading={isLoading}
        canMutateCoupons={canMutateCoupons}
        pagination={pagination}
        page={page}
        onPageChange={setPage}
        onToggleStatus={(id) => toggleMutation.mutate(id)}
        onDeleteClick={setDeleteTarget}
      />

      <DeleteCouponModal
        coupon={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
      />
    </div>
  );
}
