import { DeadLetterJobMetadata } from '@/lib/api/admin/diagnostics.service';
import { Modal } from '@mad/ui';

export interface RetryJobModalProps {
  confirmRetryJob: DeadLetterJobMetadata;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isPending: boolean;
}

export function RetryJobModal({
  confirmRetryJob,
  onClose,
  onConfirm,
  isPending,
}: RetryJobModalProps) {
  return (
    <Modal
      isOpen={!!confirmRetryJob}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="retry-job-title"
      className="glass border border-border-subtle p-6 max-w-md space-y-4"
    >
      <h3 id="retry-job-title" className="text-base font-bold text-white">Replay Dead Letter Job</h3>
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
            <span className="text-red-400 block mt-0.5 truncate">
              {confirmRetryJob.failedReason || 'Unknown error'}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-border-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(confirmRetryJob._id)}
            disabled={isPending}
            className="px-4 py-2 bg-accent-purple text-white font-semibold text-xs rounded-xl hover:bg-accent-purple-dark transition-colors disabled:opacity-60"
          >
            {isPending ? 'Retrying...' : 'Re-enqueue Job'}
          </button>
        </div>
    </Modal>
  );
}
