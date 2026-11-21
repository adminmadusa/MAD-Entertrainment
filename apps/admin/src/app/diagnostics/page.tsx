'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { DeadLetterQueueTab } from '@/components/diagnostics/DeadLetterQueueTab';
import { DiagnosticsAccessDenied } from '@/components/diagnostics/DiagnosticsAccessDenied';
import { DiagnosticsHealthTab } from '@/components/diagnostics/DiagnosticsHealthTab';
import { DiagnosticsModals } from '@/components/diagnostics/DiagnosticsModals';
import { DiagnosticsNavigation } from '@/components/diagnostics/DiagnosticsNavigation';
import { QueueControlsTab } from '@/components/diagnostics/QueueControlsTab';
import { ReservationLedgerTab } from '@/components/diagnostics/ReservationLedgerTab';
import {
  adminGetConsistencyReport,
  adminGetDlqJobs,
  adminGetQueues,
  adminGetReservations,
  adminGetSystemHealth,
} from '@/lib/api/admin/diagnostics.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole, QUERY_KEYS } from '@mad/shared';
import { Button } from '@mad/ui';
import { useDiagnosticsActions } from './_hooks/useDiagnosticsActions';

export default function DiagnosticsPage() {
  const { admin } = useAdminAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = admin?.role === AdminRole.SUPER_ADMIN;

  // Tabs state: health, queues, dlq, reservations
  const [activeSubTab, setActiveSubTab] = useState<'health' | 'queues' | 'dlq' | 'reservations'>('health');

  // Reservations tab state
  const [reservationStatus, setReservationStatus] = useState('');

  // DLQ tab filters and pagination
  const [dlqPage, setDlqPage] = useState(1);
  const [dlqLimit] = useState(10);
  const [dlqQueue, setDlqQueue] = useState('');
  const [dlqSearch, setDlqSearch] = useState('');

  // Fetch consistency report
  const { data: report } = useQuery({
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

  // Extracted actions and dialog states
  const {
    inspectingJobId,
    inspectedJob,
    isInspectLoading,
    inspectError,
    confirmRetryJob,
    confirmRetryAll,
    drainTargetQueue,
    repairMutation,
    retryMutation,
    retryAllMutation,
    pauseMutation,
    resumeMutation,
    drainMutation,
    handleInspect,
    handleCopyPayload,
    handleCloseInspector,
    handleRetryInspectorJob,
    setConfirmRetryJob,
    setConfirmRetryAll,
    setDrainTargetQueue,
  } = useDiagnosticsActions({
    queryClient,
    refetchDlq,
  });

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
          <Button
            type="button"
            variant="primary"
            onClick={() => repairMutation.mutate()}
            disabled={repairMutation.isPending}
            className="btn-gradient text-white font-semibold text-sm rounded-xl disabled:opacity-60 transition-opacity"
          >
            {repairMutation.isPending ? 'Repairing...' : 'Run Repair'}
          </Button>
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
        onCloseInspector={handleCloseInspector}
        onRetryInspectorJob={handleRetryInspectorJob}
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
