import React from 'react';

export interface AdminFormActionsProps {
  isPending: boolean;
  onCancel: () => void;
  submitLabel: string;
  pendingLabel?: string;
  submitId?: string;
}

export const AdminFormActions = React.memo(function AdminFormActions({
  isPending,
  onCancel,
  submitLabel,
  pendingLabel = 'Saving...',
  submitId,
}: AdminFormActionsProps) {
  return (
    <div className="flex gap-4 pb-6">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors"
      >
        Cancel
      </button>
      <button
        id={submitId}
        type="submit"
        disabled={isPending}
        className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
});
