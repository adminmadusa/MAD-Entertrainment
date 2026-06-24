'use client';

import { QUERY_KEYS, AdminRole } from '@mad/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/providers/AdminAuthProvider';

import {
  adminGetConsistencyReport,
  adminGetReservations,
  adminRepairConsistency,
  adminGetDlqJobs,
  adminGetDlqJobPayload,
  adminRetryDlqJob,
  adminRetryAllDlqJobs,
  adminGetSystemHealth,
  adminGetQueues,
  adminPauseQueue,
  adminResumeQueue,
  adminDrainQueue,
  DeadLetterJobMetadata,
  DeadLetterJobDetails,
} from '@/lib/api/admin/diagnostics.service';

export default function DiagnosticsPage() {
  const { admin } = useAdminAuth();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isSuperAdmin = admin?.role === AdminRole.SUPER_ADMIN;
  const isAdmin = admin?.role === AdminRole.ADMIN || isSuperAdmin;

  // Tabs state: health, queues, dlq, reservations
  const [activeSubTab, setActiveSubTab] = useState<'health' | 'queues' | 'dlq' | 'reservations'>('health');

  // Reservations tab state
  const [reservationStatus, setReservationStatus] = useState('');

  // DLQ tab filters and pagination
  const [dlqPage, setDlqPage] = useState(1);
  const [dlqLimit] = useState(10);
  const [dlqQueue, setDlqQueue] = useState('');
  const [dlqSearch, setDlqSearch] = useState('');

  // Inspections and dialogs state
  const [inspectingJobId, setInspectingJobId] = useState<string | null>(null);
  const [inspectedJob, setInspectedJob] = useState<DeadLetterJobDetails | null>(null);
  const [isInspectLoading, setIsInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Single job retry confirmation modal
  const [confirmRetryJob, setConfirmRetryJob] = useState<DeadLetterJobMetadata | null>(null);

  // Bulk retry safety dialog
  const [confirmRetryAll, setConfirmRetryAll] = useState(false);

  // Queue controls state
  const [drainConfirmText, setDrainConfirmText] = useState('');
  const [drainTargetQueue, setDrainTargetQueue] = useState<string | null>(null);

  // Fetch consistency report
  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.consistency(),
    queryFn: adminGetConsistencyReport,
    refetchInterval: 30_000,
    enabled: isAdmin,
  });

  // Fetch reservations
  const { data: reservations } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.reservations(reservationStatus),
    queryFn: () => adminGetReservations(reservationStatus || undefined),
    refetchInterval: 30_000,
    enabled: isAdmin && activeSubTab === 'reservations',
  });

  // Fetch system health (including BullMQ queue details)
  const { data: health, isLoading: isHealthLoading } = useQuery({
    queryKey: ['admin', 'diagnostics', 'health'],
    queryFn: adminGetSystemHealth,
    refetchInterval: 15_000,
    enabled: isAdmin,
  });

  // Fetch DLQ paginated list
  const { data: dlqResponse, isLoading: isDlqLoading, refetch: refetchDlq } = useQuery({
    queryKey: ['admin', 'diagnostics', 'dlq', dlqPage, dlqLimit, dlqQueue, dlqSearch],
    queryFn: () => adminGetDlqJobs({ page: dlqPage, limit: dlqLimit, queueName: dlqQueue || undefined, search: dlqSearch || undefined }),
    refetchInterval: 30_000,
    enabled: isAdmin,
  });

  // Fetch queue controls
  const { data: queueControls, isLoading: isQueuesLoading, refetch: refetchQueues } = useQuery({
    queryKey: ['admin', 'diagnostics', 'queue-controls'],
    queryFn: adminGetQueues,
    refetchInterval: 15_000,
    enabled: isAdmin && activeSubTab === 'queues',
  });

  // Consistency repair mutation
  const repairMutation = useMutation({
    mutationFn: adminRepairConsistency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.diagnostics.consistency() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'health'] });
    },
  });

  // Single job retry mutation
  const retryMutation = useMutation({
    mutationFn: adminRetryDlqJob,
    onSuccess: () => {
      setConfirmRetryJob(null);
      refetchDlq();
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'health'] });
    },
  });

  // Retry all jobs mutation
  const retryAllMutation = useMutation({
    mutationFn: adminRetryAllDlqJobs,
    onSuccess: () => {
      setConfirmRetryAll(false);
      refetchDlq();
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'health'] });
    },
  });

  // Queue mutations
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

  // Lazy inspect handler
  const handleInspect = async (id: string) => {
    setInspectingJobId(id);
    setIsInspectLoading(true);
    setInspectError(null);
    setInspectedJob(null);
    try {
      const details = await adminGetDlqJobPayload(id);
      setInspectedJob(details);
    } catch (err: any) {
      setInspectError(err.response?.data?.message || err.message || 'Failed to retrieve payload');
    } finally {
      setIsInspectLoading(false);
    }
  };

  const handleCopyPayload = () => {
    if (inspectedJob) {
      navigator.clipboard.writeText(JSON.stringify(inspectedJob.data, null, 2));
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center text-2xl mx-auto">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="text-text-muted text-sm leading-relaxed">
            You do not have the required administrative permissions to access the diagnostics workspace.
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

  const dlqCount = health?.dlq?.totalFailedCount ?? 0;
  const isDlqBulkReplayBlocked = dlqCount > 50;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Diagnostics Console</h1>
          <p className="text-text-muted text-sm mt-0.5">
            System status monitoring, Dead Letter Queue management, and self-healing controls.
          </p>
        </div>
        {isSuperAdmin && activeSubTab === 'health' && (
          <button
            type="button"
            onClick={() => repairMutation.mutate()}
            disabled={repairMutation.isPending}
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl disabled:opacity-60 transition-opacity"
          >
            {repairMutation.isPending ? 'Repairing...' : 'Run Repair'}
          </button>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-border-subtle">
        <Link
          href="/diagnostics"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] border-accent-purple text-accent-purple-light`}
        >
          Consistency & Health
        </Link>
        <Link
          href="/diagnostics/webhooks"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] border-transparent text-text-secondary hover:text-text-primary`}
        >
          Webhooks
        </Link>
        <Link
          href="/diagnostics/emails"
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] border-transparent text-text-secondary hover:text-text-primary`}
        >
          Email Logs
        </Link>
      </div>

      {/* Sub tabs inside Consistency & Health workspace */}
      <div className="flex space-x-2 bg-white/5 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveSubTab('health')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'health' ? 'bg-white/10 text-white shadow' : 'text-text-secondary hover:text-white'
          }`}
        >
          Health & Metrics
        </button>
        <button
          onClick={() => setActiveSubTab('queues')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'queues' ? 'bg-white/10 text-white shadow' : 'text-text-secondary hover:text-white'
          }`}
        >
          Queue Controls
        </button>
        <button
          onClick={() => setActiveSubTab('dlq')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'dlq' ? 'bg-white/10 text-white shadow' : 'text-text-secondary hover:text-white'
          }`}
        >
          Dead Letter Queue
          {dlqCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
              isDlqBulkReplayBlocked ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
            }`}>
              {dlqCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('reservations')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'reservations' ? 'bg-white/10 text-white shadow' : 'text-text-secondary hover:text-white'
          }`}
        >
          Reservation Ledger
        </button>
      </div>

      {/* TAB 1: Health & Metrics */}
      {activeSubTab === 'health' && (
        <div className="space-y-6">
          {/* Health Status Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-xl border border-border-subtle p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Database Engine</div>
                <div className="text-lg font-black text-white mt-1">MongoDB Atlas</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${health?.database?.state === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                <span className="text-xs text-text-secondary capitalize">{health?.database?.state || 'checking'}</span>
              </div>
            </div>

            <div className="glass rounded-xl border border-border-subtle p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">In-Memory Cache</div>
                <div className="text-lg font-black text-white mt-1">Redis Datastore</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${health?.redis?.connected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                <span className="text-xs text-text-secondary">{health?.redis?.connected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>

            <div className="glass rounded-xl border border-border-subtle p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Real-time Sockets</div>
                <div className="text-lg font-black text-white mt-1">Socket.io Engine</div>
              </div>
              <div className="text-xs text-text-secondary text-right">
                <div>Connected: {health?.sockets?.connectedClients ?? 0} clients</div>
                <div className="text-[10px] text-text-muted">Admin connections: {health?.sockets?.adminClients ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Queue Statistics */}
          <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
            <div className="p-4 border-b border-border-subtle">
              <h2 className="text-white font-bold text-sm">Async Worker Queues (BullMQ)</h2>
              <p className="text-text-muted text-xs mt-0.5">Metrics from active background job processors.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-left">
                    <th className="py-3 px-4 font-medium">Queue Name</th>
                    <th className="py-3 px-4 font-medium text-center">Active</th>
                    <th className="py-3 px-4 font-medium text-center">Waiting</th>
                    <th className="py-3 px-4 font-medium text-center">Delayed</th>
                    <th className="py-3 px-4 font-medium text-center">Completed</th>
                    <th className="py-3 px-4 font-medium text-center">Failed</th>
                    <th className="py-3 px-4 font-medium text-right">Oldest Job Age</th>
                  </tr>
                </thead>
                <tbody>
                  {health?.queues?.map((q) => (
                    <tr key={q.name} className="border-b border-border-subtle/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-semibold text-white">{q.name}</td>
                      <td className="py-3 px-4 text-center text-blue-400 font-bold">{q.active}</td>
                      <td className="py-3 px-4 text-center text-yellow-500 font-bold">{q.waiting}</td>
                      <td className="py-3 px-4 text-center text-purple-400">{q.delayed}</td>
                      <td className="py-3 px-4 text-center text-green-400">{q.completed}</td>
                      <td className="py-3 px-4 text-center text-red-500 font-bold">{q.failed}</td>
                      <td className="py-3 px-4 text-right text-text-secondary">
                        {q.oldestWaitingJobAgeMs > 0 ? `${(q.oldestWaitingJobAgeMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                  {isHealthLoading && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">Loading queue health statistics...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consistency report watchdog stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-xl border border-border-subtle p-4">
              <div className="font-bold text-white text-xs mb-3">Self-Healing Watchdog Counts</div>
              <div className="grid grid-cols-3 gap-2">
                {report && Object.entries(report.counts).map(([label, value]) => (
                  <div key={label} className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="text-[9px] uppercase tracking-wider text-text-muted truncate">{label.replace(/([A-Z])/g, ' $1')}</div>
                    <div className="text-lg font-black text-white mt-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl border border-border-subtle p-4">
              <div className="font-bold text-white text-xs mb-3">Active Inventory Drift Status</div>
              <div className="grid grid-cols-3 gap-2">
                {report && Object.entries(report.drift).map(([label, value]) => (
                  <div key={label} className={`p-3 rounded-lg border ${value > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                    <div className="text-[9px] uppercase tracking-wider text-text-muted truncate">{label.replace(/([A-Z])/g, ' $1')}</div>
                    <div className={`text-lg font-black mt-1 ${value > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Queue Controls */}
      {activeSubTab === 'queues' && (
        <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <div>
              <h2 className="text-white font-bold text-sm">BullMQ Queue Controls</h2>
              <p className="text-text-muted text-xs mt-0.5">Pause, resume, or drain workers and job queues.</p>
            </div>
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
                  <th className="py-3 px-4 font-medium">Queue Name</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-center">Active</th>
                  <th className="py-3 px-4 font-medium text-center">Waiting</th>
                  <th className="py-3 px-4 font-medium text-center">Delayed</th>
                  <th className="py-3 px-4 font-medium text-center">Completed</th>
                  <th className="py-3 px-4 font-medium text-center">Failed</th>
                  {isSuperAdmin && <th className="py-3 px-4 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isQueuesLoading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 8 : 7} className="py-10 text-center text-text-muted">
                      Loading queue statuses...
                    </td>
                  </tr>
                ) : (
                  (queueControls ?? []).map((q) => (
                    <tr key={q.name} className="border-b border-border-subtle/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-semibold text-white">{q.name}</td>
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
                      <td className="py-3 px-4 text-center text-blue-400 font-bold">{q.active}</td>
                      <td className="py-3 px-4 text-center text-yellow-500 font-bold">{q.waiting}</td>
                      <td className="py-3 px-4 text-center text-purple-400">{q.delayed}</td>
                      <td className="py-3 px-4 text-center text-green-400">{q.completed}</td>
                      <td className="py-3 px-4 text-center text-red-500 font-bold">{q.failed}</td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {q.isPaused ? (
                            <button
                              type="button"
                              onClick={() => resumeMutation.mutate(q.name)}
                              disabled={resumeMutation.isPending}
                              className="px-2 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-60"
                            >
                              {resumeMutation.isPending ? 'Resuming...' : 'Resume'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => pauseMutation.mutate(q.name)}
                              disabled={pauseMutation.isPending}
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-60"
                            >
                              {pauseMutation.isPending ? 'Pausing...' : 'Pause'}
                            </button>
                          )}
                          {q.name === 'marketing-queue' && (
                            <button
                              type="button"
                              onClick={() => setDrainTargetQueue(q.name)}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              Drain
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
                {!isQueuesLoading && !queueControls?.length && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 8 : 7} className="py-10 text-center text-text-muted">
                      No queues found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DLQ Management */}
      {activeSubTab === 'dlq' && (
        <div className="space-y-4">
          {/* Filters & Bulk Operations */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-border-subtle">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search job ID or Name..."
                value={dlqSearch}
                onChange={(event) => { setDlqSearch(event.target.value); setDlqPage(1); }}
                className="px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary placeholder:text-text-muted w-full sm:w-48 outline-none focus:border-accent-purple"
              />
              <select
                value={dlqQueue}
                onChange={(event) => { setDlqQueue(event.target.value); setDlqPage(1); }}
                className="px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary outline-none"
              >
                <option value="">All Queues</option>
                <option value="booking-queue">Booking Queue</option>
                <option value="pdf-queue">PDF Queue</option>
                <option value="notification-queue">Notification Queue</option>
                <option value="marketing-queue">Marketing Queue</option>
              </select>
              <button
                onClick={() => refetchDlq()}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs border border-border-subtle transition-colors"
                title="Refresh Logs"
              >
                🔄
              </button>
            </div>

            {isSuperAdmin && dlqCount > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setConfirmRetryAll(true)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-opacity ${
                    isDlqBulkReplayBlocked ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={isDlqBulkReplayBlocked || retryAllMutation.isPending}
                >
                  {retryAllMutation.isPending ? 'Replaying...' : 'Replay All Failed'}
                </button>
              </div>
            )}
          </div>

          {/* Safety Warnings */}
          {isDlqBulkReplayBlocked && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>
                <strong>Bulk replay blocked:</strong> Total DLQ jobs count ({dlqCount}) exceeds the safety limit of 50. Please inspect and retry jobs individually.
              </span>
            </div>
          )}

          {/* DLQ Table */}
          <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-left">
                    <th className="py-3 px-4 font-medium">Queue Name</th>
                    <th className="py-3 px-4 font-medium">Job ID</th>
                    <th className="py-3 px-4 font-medium">Job Name</th>
                    <th className="py-3 px-4 font-medium text-center">Attempts</th>
                    <th className="py-3 px-4 font-medium">Failure Reason</th>
                    <th className="py-3 px-4 font-medium">Failed Date</th>
                    {isSuperAdmin && <th className="py-3 px-4 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {(dlqResponse?.data ?? []).map((job) => (
                    <tr key={job._id} className="border-b border-border-subtle/40 hover:bg-white/[0.01]">
                      <td className="py-3 px-4 font-semibold text-white">{job.queueName}</td>
                      <td className="py-3 px-4 font-mono text-accent-purple-light">{job.jobId}</td>
                      <td className="py-3 px-4 text-text-secondary">{job.jobName}</td>
                      <td className="py-3 px-4 text-center font-bold text-text-primary">{job.attemptsMade}</td>
                      <td className="py-3 px-4 text-red-400 max-w-xs truncate" title={job.failedReason}>{job.failedReason || 'Unknown error'}</td>
                      <td className="py-3 px-4 text-text-muted">{new Date(job.processedAt).toLocaleString('en-IN')}</td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleInspect(job._id)}
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-medium rounded-lg border border-border-subtle transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => setConfirmRetryJob(job)}
                            className="px-2 py-1 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple-light text-[10px] font-semibold rounded-lg border border-accent-purple/40 transition-colors"
                          >
                            Retry
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!dlqResponse?.data?.length && !isDlqLoading && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="py-12 text-center text-text-muted">
                        No dead letter queue jobs recorded. System is healthy!
                      </td>
                    </tr>
                  )}
                  {isDlqLoading && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="py-12 text-center text-text-muted">
                        Fetching DLQ data...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {dlqResponse && dlqResponse.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-white/[0.01] text-xs">
                <span className="text-text-muted">
                  Showing Page {dlqResponse.pagination.page} of {dlqResponse.pagination.totalPages} ({dlqResponse.pagination.total} total items)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDlqPage((prev) => Math.max(prev - 1, 1))}
                    disabled={dlqPage === 1}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-40 disabled:hover:bg-white/5 transition-colors border border-border-subtle"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setDlqPage((prev) => Math.min(prev + 1, dlqResponse.pagination.totalPages))}
                    disabled={dlqPage === dlqResponse.pagination.totalPages}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-40 disabled:hover:bg-white/5 transition-colors border border-border-subtle"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Reservations */}
      {activeSubTab === 'reservations' && (
        <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <h2 className="text-white font-bold text-sm">Active Reservation Ledger</h2>
            <select
              value={reservationStatus}
              onChange={(event) => setReservationStatus(event.target.value)}
              className="px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary outline-none"
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
                <tr className="border-b border-border-subtle text-text-muted text-left">
                  {['Reservation', 'Status', 'Inventory', 'Qty', 'Seat/Section', 'Booking', 'Version', 'Expires'].map((heading) => (
                    <th key={heading} className="font-medium py-3 px-4">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(reservations ?? []).map((res) => (
                  <tr key={res._id} className="border-b border-border-subtle/40 hover:bg-white/[0.01]">
                    <td className="py-3 px-4 font-mono text-accent-purple">{res.reservationId}</td>
                    <td className="py-3 px-4 text-white capitalize">{res.status.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-text-secondary capitalize">{res.inventoryState}</td>
                    <td className="py-3 px-4 text-text-secondary font-bold text-center">{res.quantity}</td>
                    <td className="py-3 px-4 text-text-secondary">{res.seatId ?? res.section ?? '—'}</td>
                    <td className="py-3 px-4 text-text-secondary font-semibold">{res.bookingReference ?? '—'}</td>
                    <td className="py-3 px-4 text-text-muted text-center">{res.reservationVersion}</td>
                    <td className="py-3 px-4 text-text-secondary">{new Date(res.expiresAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {!reservations?.length && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-text-muted">No reservation logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECTION DRAWER (SUPER_ADMIN ONLY) */}
      {inspectingJobId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-2xl bg-background-card border-l border-border-subtle h-full shadow-2xl flex flex-col animate-slide-in">
            {/* Drawer Header */}
            <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="text-lg font-black text-white">Inspect Job Payload</h3>
                <p className="text-xs text-text-muted mt-0.5">Decrypting and inspecting raw transaction payloads.</p>
              </div>
              <button
                onClick={() => { setInspectingJobId(null); setInspectedJob(null); }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isInspectLoading && (
                <div className="text-center py-12 text-xs text-text-muted">
                  Decrypting payload on-demand... Please wait.
                </div>
              )}

              {inspectError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                  {inspectError}
                </div>
              )}

              {inspectedJob && (
                <div className="space-y-4">
                  {/* Job Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-border-subtle">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Queue Name</div>
                      <div className="text-xs text-white font-semibold mt-1">{inspectedJob.queueName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Job Name</div>
                      <div className="text-xs text-white font-semibold mt-1">{inspectedJob.jobName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Job ID</div>
                      <div className="text-xs font-mono text-accent-purple-light mt-1">{inspectedJob.jobId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Attempts Made</div>
                      <div className="text-xs text-white font-semibold mt-1">{inspectedJob.attemptsMade}</div>
                    </div>
                  </div>

                  {/* Decrypted Payload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Decrypted Data Payload</div>
                      <button
                        onClick={handleCopyPayload}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] transition-colors"
                      >
                        Copy JSON
                      </button>
                    </div>
                    <pre className="p-4 bg-black rounded-xl border border-border-subtle overflow-auto text-xs font-mono text-green-400 max-h-72">
                      {JSON.stringify(inspectedJob.data, null, 2)}
                    </pre>
                  </div>

                  {/* Stacktrace */}
                  {inspectedJob.stacktrace && inspectedJob.stacktrace.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Exception Stacktrace</div>
                      <pre className="p-4 bg-black rounded-xl border border-border-subtle overflow-auto text-[10px] font-mono text-red-300 max-h-48 whitespace-pre-wrap">
                        {inspectedJob.stacktrace.join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-border-subtle bg-white/[0.01] flex justify-end gap-3">
              <button
                onClick={() => { setInspectingJobId(null); setInspectedJob(null); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-border-subtle transition-colors"
              >
                Close Inspector
              </button>
              {isSuperAdmin && inspectedJob && (
                <button
                  onClick={() => {
                    setConfirmRetryJob(inspectedJob);
                    setInspectingJobId(null);
                    setInspectedJob(null);
                  }}
                  className="px-4 py-2 bg-accent-purple text-white font-semibold text-xs rounded-xl hover:bg-accent-purple-dark transition-colors"
                >
                  Retry Job
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SINGLE JOB RETRY CONFIRMATION MODAL */}
      {confirmRetryJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-md border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Replay Dead Letter Job</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to manually re-enqueue this job? This will retry the background task immediately.
            </p>

            <div className="bg-white/5 p-3 rounded-lg border border-border-subtle space-y-2 text-xs">
              <div>
                <span className="text-text-muted">Queue:</span>{' '}
                <span className="text-white font-semibold">{confirmRetryJob.queueName}</span>
              </div>
              <div>
                <span className="text-text-muted">Job Name:</span>{' '}
                <span className="text-white font-semibold">{confirmRetryJob.jobName}</span>
              </div>
              <div>
                <span className="text-text-muted">Job ID:</span>{' '}
                <span className="text-white font-mono text-accent-purple-light">{confirmRetryJob.jobId}</span>
              </div>
              <div>
                <span className="text-text-muted">Last Failure:</span>{' '}
                <span className="text-red-400 block mt-0.5 truncate">{confirmRetryJob.failedReason || 'Unknown error'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRetryJob(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-border-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => retryMutation.mutate(confirmRetryJob._id)}
                disabled={retryMutation.isPending}
                className="px-4 py-2 bg-accent-purple text-white font-semibold text-xs rounded-xl hover:bg-accent-purple-dark transition-colors disabled:opacity-60"
              >
                {retryMutation.isPending ? 'Retrying...' : 'Re-enqueue Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK RETRY SAFETY CONFIRMATION MODAL */}
      {confirmRetryAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-md border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-red-500">⚠️</span> Bulk Replay Safety Authorization
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              You are about to replay all currently failing jobs in the Dead Letter Queue.
            </p>

            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs space-y-2 text-red-300">
              <div>
                <strong>Replay count:</strong> {dlqCount} failed jobs
              </div>
              <div className="text-[11px] leading-relaxed">
                Bulk replay can cause spikes in server CPU load, database locks, and external API requests (e.g. SMTP/Razorpay triggers). Ensure that the underlying failure reason has been resolved before proceeding.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRetryAll(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-border-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => retryAllMutation.mutate()}
                disabled={retryAllMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white font-semibold text-xs rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {retryAllMutation.isPending ? 'Processing...' : `Replay All ${dlqCount} Jobs`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAIN QUEUE CONFIRMATION MODAL */}
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
