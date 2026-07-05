import React from 'react';

import { DJFormActionsProps } from './types';

export const DJFormActions: React.FC<DJFormActionsProps> = ({
  onCancel,
  submitLabel,
  pendingLabel,
  isPending,
}) => {
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
        id="dj-submit"
        type="submit"
        disabled={isPending}
        className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
};
