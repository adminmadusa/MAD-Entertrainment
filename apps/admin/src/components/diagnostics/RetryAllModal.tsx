import { Modal } from '@mad/ui';

export interface RetryAllModalProps {
  dlqCount: number;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function RetryAllModal({
  dlqCount,
  onClose,
  onConfirm,
  isPending,
}: RetryAllModalProps) {
  return (
    <Modal
      isOpen={dlqCount > 0}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="retry-all-title"
      className="glass border border-red-500/30 p-6 max-w-md space-y-4"
    >
      <h3 id="retry-all-title" className="text-base font-bold text-white flex items-center gap-2">
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
            Bulk replay can cause spikes in server CPU load, database locks, and external API requests (e.g.
            SMTP/Razorpay triggers). Ensure that the underlying failure reason has been resolved before proceeding.
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
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 bg-red-600 text-white font-semibold text-xs rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {isPending ? 'Processing...' : `Replay All ${dlqCount} Jobs`}
          </button>
        </div>
    </Modal>
  );
}
