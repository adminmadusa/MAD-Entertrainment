"use client";

import { Coupon } from "@mad/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import {
  adminGetCoupons,
  adminDeleteCoupon,
  adminToggleCoupon,
} from "@/lib/api/admin/coupon.service";
import { extractApiError } from "@/lib/api/client";
import ErrorState from "@/components/states/ErrorState";

export default function AdminCouponsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-coupons", page, activeFilter],
    queryFn: () => adminGetCoupons(page, 15, activeFilter || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteCoupon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDeleteTarget(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminToggleCoupon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const coupons = data?.items ?? [];
  const pagination = data?.pagination;

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          message={(error as Error).message || "Failed to load coupons."}
        />
      </div>
    );
  }

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
            <option value="" className="bg-black">
              All Statuses
            </option>
            <option value="true" className="bg-black">
              Active Only
            </option>
            <option value="false" className="bg-black">
              Inactive Only
            </option>
          </select>
          <Link
            href="/coupons/new"
            id="admin-create-coupon"
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm motion-safe:hover:scale-105 transition-transform motion-reduce:transition-none flex items-center gap-2"
          >
            <span>+</span> Create Coupon
          </Link>
        </div>
      </div>

      {/* Table */}
      <div
        className="glass rounded-2xl border border-border-subtle overflow-hidden min-h-[360px]"
        aria-busy={isLoading}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-text-muted font-medium py-3.5 px-5">
                  Code & Description
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Discount
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Usage Limit
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Validity Period
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Status
                </th>
                <th className="text-right text-text-muted font-medium py-3.5 px-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-subtle/50 animate-pulse motion-reduce:animate-none"
                  >
                    <td className="py-4 px-5">
                      <div className="h-4 bg-white/5 rounded w-48" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-16" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-36" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-16" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-white/5 rounded w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <div className="min-h-[240px] flex flex-col items-center justify-center gap-3 text-center">
                      <p className="text-white text-sm font-medium">
                        No coupons found
                      </p>
                      <p className="text-text-muted text-xs">
                        Try adjusting filters or create your first coupon.
                      </p>
                      <Link
                        href="/coupons/new"
                        className="text-accent-purple text-sm hover:underline"
                      >
                        Create your first coupon →
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr
                    key={coupon._id}
                    className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div>
                        <span className="text-white font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-sm mr-2 select-all">
                          {coupon.code}
                        </span>
                        {coupon.description && (
                          <p className="text-text-muted text-xs mt-1.5 max-w-xs truncate">
                            {coupon.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-text-secondary font-medium">
                      {coupon.discountType === "percentage" ? (
                        <span className="text-accent-purple font-semibold">
                          {coupon.discountValue}% Off
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">
                          ₹{coupon.discountValue} Off
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-text-secondary">
                      <span className="text-text-primary font-semibold">
                        {coupon.usedCount}
                      </span>{" "}
                      / {coupon.usageLimit}
                    </td>
                    <td className="py-4 px-4 text-text-secondary text-xs">
                      <div>{formatDate(coupon.validFrom)}</div>
                      <div className="text-text-muted mt-0.5">
                        to {formatDate(coupon.validUntil)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleMutation.mutate(coupon._id)}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all motion-reduce:transition-none ${
                          coupon.isActive
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/coupons/${coupon._id}/edit`}
                          className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all motion-reduce:transition-none"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(coupon)}
                          className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all motion-reduce:transition-none"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">
              Page {pagination.page} of {pagination.totalPages} ·{" "}
              {pagination.total} coupons
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all motion-reduce:transition-none"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all motion-reduce:transition-none"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-4 sm:p-6 max-w-sm w-full my-auto max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-white font-bold text-lg mb-2">
                Delete Coupon?
              </h3>
              <p className="text-text-secondary text-sm mb-1">
                Coupon code{" "}
                <strong className="text-white font-mono">
                  {deleteTarget.code}
                </strong>{" "}
                will be permanently deleted.
              </p>
              <p className="text-error text-xs mb-5">
                This action cannot be undone.
              </p>
              {deleteMutation.error && (
                <p className="text-red-400 text-xs mb-3">
                  {extractApiError(deleteMutation.error).message}
                </p>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-3">
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
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
