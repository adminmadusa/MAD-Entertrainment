'use client';

import { QUERY_KEYS } from '@mad/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/providers/AdminAuthProvider';

import {
  adminGetConsistencyReport,
  adminGetReservations,
  adminRepairConsistency,
  adminGetQueues,
  adminPauseQueue,
  adminResumeQueue,
  adminDrainQueue,
} from '@/lib/api/admin/diagnostics.service';

export default function DiagnosticsPage() {
  const { admin } = useAdminAuth();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isSuperAdmin = admin?.role === 'super_admin';
  const [status, setStatus] = useState('');

  // Local tabs & drain modal state
  const [activeSubTab, setActiveSubTab] = useState<'consistency' | 'queues'>('consistency');
  const [drainConfirmText, setDrainConfirmText] = useState('');
  const [drainTargetQueue, setDrainTargetQueue] = useState<string | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.consistency(),
    queryFn: adminGetConsistencyReport,
    refetchInterval: 30_000,
    enabled: isSuperAdmin && activeSubTab === 'consistency',
  });

  const { data: reservations } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.reservations(status),
    queryFn: () => adminGetReservations(status || undefined),
    refetchInterval: 30_000,
    enabled: isSuperAdmin && activeSubTab === 'consistency',
  });

  const repairMutation = useMutation({
    mutationFn: adminRepairConsistency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.diagnostics.consistency() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.diagnostics.reservations(status) });
    },
  });

  // Queue controls queries & mutations
  const { data: queueControls, isLoading: isQueuesLoading, refetch: refetchQueues } = useQuery({
    queryKey: ['admin', 'diagnostics', 'queue-controls'],
    queryFn: adminGetQueues,
    refetchInterval: 15_000,
    enabled: isSuperAdmin && activeSubTab === 'queues',
  });

  const pauseMutation = useMutation({
    mutationFn: adminPauseQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'queue-controls'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: adminResumeQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'queue-controls'] });
    },
  });

  const drainMutation = useMutation({
    mutationFn: adminDrainQueue,
    onSuccess: () => {
      setDrainTargetQueue(null);
      setDrainConfirmText('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'queue-controls'] });
    },
  });

  if (admin && !isSuperAdmin) {
    return (
      <div className="py-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center text-2xl mx-auto">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="text-text-muted text-sm leading-relaxed">
            You do not have the required permissions to access diagnostics. Consistency reports and ledger logs are restricted to Super Admins only.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-border-subtle transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const hasDrift = !!report && Object.values(report.drift).some((value) => value > 0);

  const getDriftMessage = () => {
    if (isLoading) return 'Checking consistency...';
    if (hasDrift) return 'Drift detected';
    return 'No inventory drift detected';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            {activeSubTab === 'consistency' ? 'Consistency Diagnostics' : 'Queue Controls'}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {activeSubTab === 'consistency'
              ? 'Reservation, Redis lock, payment, and inventory drift monitoring.'
              : 'BullMQ queue health metrics and pause/resume/drain operations.'}
          </p>
        </div>
        {isSuperAdmin && activeSubTab === 'consistency' && (
          <button
            type="button"
            onClick={() => repairMutation.mutate()}
            disabled={repairMutation.isPending}
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl disabled:opacity-60"
          >
            {repairMutation.isPending ? 'Repairing...' : 'Run Repair'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        <Link
          href="/diagnostics"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            pathname === '/diagnostics'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Consistency
        </Link>
        <Link
          href="/diagnostics/webhooks"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            pathname.startsWith('/diagnostics/webhooks')
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Webhooks
        </Link>
        <Link
          href="/diagnostics/emails"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            pathname.startsWith('/diagnostics/emails')
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Email Logs
        </Link>
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('consistency')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
            activeSubTab === 'consistency'
              ? 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple-light'
              : 'border-border-subtle text-text-secondary hover:text-text-primary bg-white/2 hover:bg-white/5'
          }`}
        >
          Consistency Report
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('queues')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
            activeSubTab === 'queues'
              ? 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple-light'
              : 'border-border-subtle text-text-secondary hover:text-text-primary bg-white/2 hover:bg-white/5'
          }`}
        >
          Queue Controls
        </button>
      </div>

      {activeSubTab === 'consistency' ? (
        <>
          <div className={`rounded-2xl border p-4 ${hasDrift ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-green-500/30 bg-green-500/10'}`}>
            <div className="text-sm font-bold text-white">
              {getDriftMessage()}
            </div>
            <div className="text-xs text-text-muted mt-1">
              Last report: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString('en-IN') : '-'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {report && Object.entries(report.counts).map(([label, value]) => (
              <MetricCard key={label} label={label} value={value} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report && Object.entries(report.drift).map(([label, value]) => (
              <MetricCard key={label} label={label} value={value} tone={value > 0 ? 'warn' : 'ok'} />
            ))}
          </div>

          <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="text-white font-bold">Reservation Ledger</h2>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary"
              >
                <option value="">All statuses</option>
                <option value="reserved">Reserved</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="expired">Expired</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    {['Reservation', 'Status', 'Inventory', 'Qty', 'Seat/Section', 'Booking', 'Version', 'Expires'].map((heading) => (
                      <th key={heading} className="text-left font-medium py-3 px-4">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(reservations ?? []).map((reservation) => (
                    <tr key={reservation._id} className="border-b border-border-subtle/40">
                      <td className="py-3 px-4 font-mono text-accent-purple">{reservation.reservationId}</td>
                      <td className="py-3 px-4 text-white">{reservation.status}</td>
                      <td className="py-3 px-4 text-text-secondary">{reservation.inventoryState}</td>
                      <td className="py-3 px-4 text-text-secondary">{reservation.quantity}</td>
                      <td className="py-3 px-4 text-text-secondary">{reservation.seatId ?? reservation.section ?? '-'}</td>
                      <td className="py-3 px-4 text-text-secondary">{reservation.bookingReference ?? '-'}</td>
                      <td className="py-3 px-4 text-text-secondary">{reservation.reservationVersion}</td>
                      <td className="py-3 px-4 text-text-secondary">{new Date(reservation.expiresAt).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {!reservations?.length && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-text-muted">No reservations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="text-white font-bold">BullMQ Queue Controls</h2>
              <button
                type="button"
                onClick={() => refetchQueues()}
                disabled={isQueuesLoading}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-border-subtle transition-colors"
              >
                {isQueuesLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-left">
                    <th className="font-medium py-3 px-4">Queue Name</th>
                    <th className="font-medium py-3 px-4">Status</th>
                    <th className="font-medium py-3 px-4">Waiting</th>
                    <th className="font-medium py-3 px-4">Active</th>
                    <th className="font-medium py-3 px-4">Delayed</th>
                    <th className="font-medium py-3 px-4">Failed</th>
                    <th className="font-medium py-3 px-4">Completed</th>
                    <th className="font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isQueuesLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-text-muted">Loading queue statuses...</td>
                    </tr>
                  ) : (
                    (queueControls ?? []).map((q) => (
                      <tr key={q.name} className="border-b border-border-subtle/40">
                        <td className="py-3 px-4 font-mono text-accent-purple font-semibold">{q.name}</td>
                        <td className="py-3 px-4">
                          {q.isPaused ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Paused
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-white font-mono">{q.waiting}</td>
                        <td className="py-3 px-4 text-white font-mono">{q.active}</td>
                        <td className="py-3 px-4 text-text-secondary font-mono">{q.delayed}</td>
                        <td className="py-3 px-4 text-red-400 font-mono font-semibold">{q.failed}</td>
                        <td className="py-3 px-4 text-green-400 font-mono">{q.completed}</td>
                        <td className="py-3 px-4 flex gap-2">
                          {isSuperAdmin && (
                            <>
                              {q.isPaused ? (
                                <button
                                  type="button"
                                  onClick={() => resumeMutation.mutate(q.name)}
                                  disabled={resumeMutation.isPending}
                                  className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Resume
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => pauseMutation.mutate(q.name)}
                                  disabled={pauseMutation.isPending}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Pause
                                </button>
                              )}
                              {q.name === 'marketing-queue' && (
                                <button
                                  type="button"
                                  onClick={() => setDrainTargetQueue(q.name)}
                                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Drain
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                  {!isQueuesLoading && !queueControls?.length && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-text-muted">No queues found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {drainTargetQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass max-w-md w-full rounded-2xl border border-red-500/30 p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-red-500">⚠️</span> Destructive Action
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                You are about to drain all jobs from <strong className="text-white">{drainTargetQueue}</strong>. This will permanently remove all waiting and delayed jobs in the queue. This action cannot be undone.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted block">
                Type <span className="font-mono text-red-400 select-all">drain-marketing-queue</span> to confirm:
              </label>
              <input
                type="text"
                value={drainConfirmText}
                onChange={(e) => setDrainConfirmText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-sm text-white focus:outline-none focus:border-red-500/50"
                placeholder="drain-marketing-queue"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDrainTargetQueue(null);
                  setDrainConfirmText('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-subtle text-text-secondary hover:text-text-primary bg-white/2 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (drainConfirmText === 'drain-marketing-queue') {
                    drainMutation.mutate(drainTargetQueue);
                  }
                }}
                disabled={drainConfirmText !== 'drain-marketing-queue' || drainMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/20 disabled:text-red-500/55 text-white transition-all"
              >
                {drainMutation.isPending ? 'Draining...' : 'Confirm Drain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  let borderClass = 'border-border-subtle';
  if (tone === 'warn') {
    borderClass = 'border-yellow-500/30';
  } else if (tone === 'ok') {
    borderClass = 'border-green-500/30';
  }

  return (
    <div className={`glass rounded-xl border p-4 ${borderClass}`}>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label.replace(/([A-Z])/g, ' $1')}</div>
      <div className="text-2xl font-black text-white mt-2">{value.toLocaleString('en-IN')}</div>
    </div>
  );
}
