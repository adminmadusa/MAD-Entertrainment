import { useState } from 'react';

export interface DrainQueueModalProps {
  drainTargetQueue: string;
  onClose: () => void;
  onConfirm: (queueName: string) => void;
  isPending: boolean;
}

export function DrainQueueModal({
  drainTargetQueue,
  onClose,
  onConfirm,
  isPending,
}: DrainQueueModalProps) {
  const [drainConfirmText, setDrainConfirmText] = useState('');
  const expectedText = `drain-${drainTargetQueue}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass max-w-md w-full rounded-2xl border border-red-500/30 p-6 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-red-500">⚠️</span> Destructive Action
          </h3>
          <p className="text-text-muted text-sm leading-relaxed">
            You are about to drain all jobs from <strong className="text-white">{drainTargetQueue}</strong>. This will
            permanently remove all waiting and delayed jobs in the queue. This action cannot be undone.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-muted block">
            Type <span className="font-mono text-red-400 select-all">{expectedText}</span> to confirm:
          </label>
          <input
            type="text"
            value={drainConfirmText}
            onChange={(e) => setDrainConfirmText(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-sm text-white focus:outline-none focus:border-red-500/50"
            placeholder={expectedText}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-subtle text-text-secondary hover:text-text-primary bg-white/2 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (drainConfirmText === expectedText) {
                onConfirm(drainTargetQueue);
              }
            }}
            disabled={drainConfirmText !== expectedText || isPending}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/20 disabled:text-red-500/55 text-white transition-all"
          >
            {isPending ? 'Draining...' : 'Confirm Drain'}
          </button>
        </div>
      </div>
    </div>
  );
}
