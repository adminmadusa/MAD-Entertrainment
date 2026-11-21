'use client';

import React from 'react';
import Link from 'next/link';
import type { Coupon, PaginatedItemsResponse } from '@mad/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Button } from '@mad/ui';
import { Tag } from '@mad/ui/icons';
import { formatDate } from '@mad/utils';

export interface CouponsTableProps {
  coupons: Coupon[];
  isLoading: boolean;
  canMutateCoupons: boolean;
  pagination?: PaginatedItemsResponse<Coupon>['pagination'];
  page: number;
  onPageChange: (newPage: number) => void;
  onToggleStatus: (id: string) => void;
  onDeleteClick: (coupon: Coupon) => void;
}

export function CouponsTable({
  coupons,
  isLoading,
  canMutateCoupons,
  pagination,
  page,
  onPageChange,
  onToggleStatus,
  onDeleteClick,
}: CouponsTableProps) {
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(coupon._id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium h-auto ${
                coupon.isActive
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              {coupon.isActive ? 'Active' : 'Inactive'}
            </Button>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDeleteClick(coupon)}
                className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-red-400 hover:border-red-500/40"
              >
                Delete
              </Button>
            </div>
          ) : (
            <div className="text-right text-text-muted">—</div>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  return (
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
          <p className="text-text-muted text-xs">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} coupons
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg text-text-secondary hover:text-white"
            >
              ← Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 text-xs rounded-lg text-text-secondary hover:text-white"
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
