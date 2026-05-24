'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { adminGetRefunds, adminProcessRefund, type AdminRefund } from '@/lib/api/admin/booking.service';


export default function AdminRefundsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [processTarget, setProcessTarget] = useState<AdminRefund | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [gatewayId, setGatewayId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-refunds', { page, status: statusFilter }],
    queryFn: () => adminGetRefunds({ page: String(page), limit: '15', ...(statusFilter && { status: statusFilter }) }),
  });

  const processMutation = useMutation({
    mutationFn: () => adminProcessRefund(processTarget!._id, action, adminNotes, gatewayId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-refunds'] }); setProcessTarget(null); setAdminNotes(''); setGatewayId(''); },
  });

  const refunds = data?.data ?? [];
  const pagination = data?.pagination;

  const STATUS_COLORS: Record<string, string> = {
    requested: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
    failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Refunds</h1>
          <p className="text-text-muted text-sm mt-0.5">{pagination?.total ?? 0} refund requests</p>
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple">
          <option value="">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Booking', 'Amount', 'Reason', 'Status', 'Requested', 'Action'].map((h) => (
                  <th key={h} className="text-left text-text-muted font-medium py-3.5 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border-subtle/40 animate-pulse">
                  {Array.from({ length: 6 }).map((__, j) => <td key={j} className="py-4 px-4"><div className="h-3.5 bg-white/5 rounded w-20" /></td>)}
                </tr>
              )) : refunds.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-text-muted">No refunds found.</td></tr>
              ) : refunds.map((refund) => (
                <tr key={refund._id} className="border-b border-border-subtle/40 hover:bg-white/2">
                  <td className="py-3.5 px-4 font-mono text-xs text-accent-purple">
                    {(refund.bookingId as { bookingId?: string })?.bookingId ?? String(refund.bookingId).slice(-8)}
                  </td>
                  <td className="py-3.5 px-4 text-white font-semibold">₹{refund.amount.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 text-text-secondary max-w-40 truncate">{refund.reason ?? '—'}</td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[refund.status] ?? ''}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-text-muted text-xs">{new Date(refund.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="py-3.5 px-4">
                    {refund.status === 'requested' && (
                      <button onClick={() => setProcessTarget(refund)}
                        className="px-3 py-1.5 text-xs glass border border-accent-purple/30 rounded-lg text-accent-purple hover:bg-accent-purple/10 transition-all">
                        Process
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary">← Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary">Next →</button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {processTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-sm w-full space-y-4">
              <h3 className="text-white font-bold">Process Refund — ₹{processTarget.amount.toLocaleString('en-IN')}</h3>
              <div className="flex gap-3">
                {(['approve', 'reject'] as const).map((a) => (
                  <button key={a} onClick={() => setAction(a)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${action === a ? (a === 'approve' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400') : 'glass border-border-subtle text-text-secondary'}`}>
                    {a}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-text-secondary">Admin Notes</label>
                <input value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notes for audit log..." className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple" />
              </div>
              {action === 'approve' && (
                <div className="space-y-1.5">
                  <label className="text-sm text-text-secondary">Gateway Refund ID (optional)</label>
                  <input value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} placeholder="e.g. rfnd_xxx from Razorpay" className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple" />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setProcessTarget(null)} className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary">Cancel</button>
                <button onClick={() => processMutation.mutate()} disabled={processMutation.isPending}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 ${action === 'approve' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                  {processMutation.isPending ? 'Processing...' : `Confirm ${action}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
