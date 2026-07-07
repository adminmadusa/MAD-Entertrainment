'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { DeadLetterQueueTab } from '@/components/diagnostics/DeadLetterQueueTab';
import { DiagnosticsAccessDenied } from '@/components/diagnostics/DiagnosticsAccessDenied';
import { DiagnosticsHealthTab } from '@/components/diagnostics/DiagnosticsHealthTab';
import { DiagnosticsModals } from '@/components/diagnostics/DiagnosticsModals';
import { DiagnosticsNavigation } from '@/components/diagnostics/DiagnosticsNavigation';
import { QueueControlsTab } from '@/components/diagnostics/QueueControlsTab';
import { ReservationLedgerTab } from '@/components/diagnostics/ReservationLedgerTab';
import { adminGetConsistencyReport, adminGetReservations, adminRepairConsistency, adminGetDlqJobs, adminGetDlqJobPayload, adminRetryDlqJob, adminRetryAllDlqJobs, adminGetSystemHealth, adminGetQueues, adminPauseQueue, adminResumeQueue, adminDrainQueue, DeadLetterJobMetadata, DeadLetterJobDetails } from '@/lib/api/admin/diagnostics.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { QUERY_KEYS, AdminRole } from '@mad/shared';

export default function DiagnosticsPage() {
  const { admin } = useAdminAuth();
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
  const [drainTargetQueue, setDrainTargetQueue] = useState<string | null>(null);

  // Fetch consistency report
  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.consistency(),
    queryFn: adminGetConsistencyReport,
    refetchInterval: 30_000,
    enabled: isSuperAdmin,
  });

  // Fetch reservations
  const { data: reservations } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.reservations(reservationStatus),
    queryFn: () => adminGetReservations(reservationStatus || undefined),
    refetchInterval: 30_000,
    enabled: isSuperAdmin && activeSubTab === 'reservations',
  });

  // Fetch system health (including BullMQ queue details)
  const { data: health, isLoading: isHealthLoading } = useQuery({
    queryKey: ['admin', 'diagnostics', 'health'],
    queryFn: adminGetSystemHealth,
    refetchInterval: 15_000,
    enabled: isSuperAdmin,
  });

  // Fetch DLQ paginated list
  const { data: dlqResponse, isLoading: isDlqLoading, refetch: refetchDlq } = useQuery({
    queryKey: ['admin', 'diagnostics', 'dlq', dlqPage, dlqLimit, dlqQueue, dlqSearch],
    queryFn: () => adminGetDlqJobs({ page: dlqPage, limit: dlqLimit, queueName: dlqQueue || undefined, search: dlqSearch || undefined }),
    refetchInterval: 30_000,
    enabled: isSuperAdmin,
  });

  // Fetch queue controls
  const { data: queueControls, isLoading: isQueuesLoading, refetch: refetchQueues } = useQuery({
    queryKey: ['admin', 'diagnostics', 'queue-controls'],
    queryFn: adminGetQueues,
    refetchInterval: 15_000,
    enabled: isSuperAdmin && activeSubTab === 'queues',
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

  if (!isSuperAdmin) {
    return <DiagnosticsAccessDenied />;
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

      <DiagnosticsNavigation
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        dlqCount={dlqCount}
        isDlqBulkReplayBlocked={isDlqBulkReplayBlocked}
      />

      {/* TAB 1: Health & Metrics */}
      {activeSubTab === 'health' && (
        <DiagnosticsHealthTab
          health={health}
          report={report}
          isHealthLoading={isHealthLoading}
        />
      )}

      {/* TAB 2: Queue Controls */}
      {activeSubTab === 'queues' && (
        <QueueControlsTab
          queueControls={queueControls}
          isQueuesLoading={isQueuesLoading}
          isSuperAdmin={isSuperAdmin}
          onRefresh={refetchQueues}
          onPause={(name) => pauseMutation.mutate(name)}
          onResume={(name) => resumeMutation.mutate(name)}
          onDrain={(name) => setDrainTargetQueue(name)}
          isPausePending={pauseMutation.isPending}
          isResumePending={resumeMutation.isPending}
        />
      )}

      {/* TAB 3: DLQ Management */}
      {activeSubTab === 'dlq' && (
        <DeadLetterQueueTab
          dlqResponse={dlqResponse}
          isDlqLoading={isDlqLoading}
          dlqCount={dlqCount}
          isDlqBulkReplayBlocked={isDlqBulkReplayBlocked}
          isSuperAdmin={isSuperAdmin}
          dlqSearch={dlqSearch}
          onSearchChange={setDlqSearch}
          dlqQueue={dlqQueue}
          onQueueChange={setDlqQueue}
          dlqPage={dlqPage}
          onPageChange={setDlqPage}
          onRefresh={refetchDlq}
          onInspect={handleInspect}
          onRetry={(job) => setConfirmRetryJob(job)}
          onRetryAll={() => setConfirmRetryAll(true)}
          isRetryAllPending={retryAllMutation.isPending}
        />
      )}

      {/* TAB 4: Reservations */}
      {activeSubTab === 'reservations' && (
        <ReservationLedgerTab
          reservations={reservations}
          reservationStatus={reservationStatus}
          onStatusChange={setReservationStatus}
        />
      )}

      <DiagnosticsModals
        inspectingJobId={inspectingJobId}
        inspectedJob={inspectedJob}
        isInspectLoading={isInspectLoading}
        inspectError={inspectError}
        isSuperAdmin={isSuperAdmin}
        onCloseInspector={() => {
          setInspectingJobId(null);
          setInspectedJob(null);
        }}
        onRetryInspectorJob={(job) => {
          setConfirmRetryJob(job);
          setInspectingJobId(null);
          setInspectedJob(null);
        }}
        onCopyInspectorPayload={handleCopyPayload}
        confirmRetryJob={confirmRetryJob}
        onCloseRetryJob={() => setConfirmRetryJob(null)}
        onConfirmRetryJob={(id) => retryMutation.mutate(id)}
        isRetryJobPending={retryMutation.isPending}
        confirmRetryAll={confirmRetryAll}
        dlqCount={dlqCount}
        onCloseRetryAll={() => setConfirmRetryAll(false)}
        onConfirmRetryAll={() => retryAllMutation.mutate()}
        isRetryAllPending={retryAllMutation.isPending}
        drainTargetQueue={drainTargetQueue}
        onCloseDrainQueue={() => {
          setDrainTargetQueue(null);
        }}
        onConfirmDrainQueue={(name) => {
          drainMutation.mutate(name);
        }}
        isDrainQueuePending={drainMutation.isPending}
      />
    </div>
  );
}
