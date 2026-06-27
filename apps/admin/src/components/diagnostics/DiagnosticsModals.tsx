import { DeadLetterJobDetails, DeadLetterJobMetadata } from '@/lib/api/admin/diagnostics.service';
import { DlqInspectorDrawer } from './DlqInspectorDrawer';
import { RetryJobModal } from './RetryJobModal';
import { RetryAllModal } from './RetryAllModal';
import { DrainQueueModal } from './DrainQueueModal';

export interface DiagnosticsModalsProps {
  inspectingJobId: string | null;
  inspectedJob: DeadLetterJobDetails | null;
  isInspectLoading: boolean;
  inspectError: string | null;
  isSuperAdmin: boolean;
  onCloseInspector: () => void;
  onRetryInspectorJob: (job: DeadLetterJobDetails) => void;
  onCopyInspectorPayload: () => void;

  confirmRetryJob: DeadLetterJobMetadata | null;
  onCloseRetryJob: () => void;
  onConfirmRetryJob: (id: string) => void;
  isRetryJobPending: boolean;

  confirmRetryAll: boolean;
  dlqCount: number;
  onCloseRetryAll: () => void;
  onConfirmRetryAll: () => void;
  isRetryAllPending: boolean;

  drainTargetQueue: string | null;
  onCloseDrainQueue: () => void;
  onConfirmDrainQueue: (name: string) => void;
  isDrainQueuePending: boolean;
}

export function DiagnosticsModals({
  inspectingJobId,
  inspectedJob,
  isInspectLoading,
  inspectError,
  isSuperAdmin,
  onCloseInspector,
  onRetryInspectorJob,
  onCopyInspectorPayload,
  confirmRetryJob,
  onCloseRetryJob,
  onConfirmRetryJob,
  isRetryJobPending,
  confirmRetryAll,
  dlqCount,
  onCloseRetryAll,
  onConfirmRetryAll,
  isRetryAllPending,
  drainTargetQueue,
  onCloseDrainQueue,
  onConfirmDrainQueue,
  isDrainQueuePending,
}: DiagnosticsModalsProps) {
  return (
    <>
      {/* INSPECTION DRAWER (SUPER_ADMIN ONLY) */}
      {inspectingJobId && (
        <DlqInspectorDrawer
          inspectingJobId={inspectingJobId}
          inspectedJob={inspectedJob}
          isInspectLoading={isInspectLoading}
          inspectError={inspectError}
          isSuperAdmin={isSuperAdmin}
          onClose={onCloseInspector}
          onRetryJob={onRetryInspectorJob}
          onCopyPayload={onCopyInspectorPayload}
        />
      )}

      {/* SINGLE JOB RETRY CONFIRMATION MODAL */}
      {confirmRetryJob && (
        <RetryJobModal
          confirmRetryJob={confirmRetryJob}
          onClose={onCloseRetryJob}
          onConfirm={onConfirmRetryJob}
          isPending={isRetryJobPending}
        />
      )}

      {/* BULK RETRY SAFETY CONFIRMATION MODAL */}
      {confirmRetryAll && (
        <RetryAllModal
          dlqCount={dlqCount}
          onClose={onCloseRetryAll}
          onConfirm={onConfirmRetryAll}
          isPending={isRetryAllPending}
        />
      )}

      {/* DRAIN QUEUE CONFIRMATION MODAL */}
      {drainTargetQueue && (
        <DrainQueueModal
          drainTargetQueue={drainTargetQueue}
          onClose={onCloseDrainQueue}
          onConfirm={onConfirmDrainQueue}
          isPending={isDrainQueuePending}
        />
      )}
    </>
  );
}
