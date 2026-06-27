import React from 'react';

export interface EventEditActionsProps {
  onCancel: () => void;
  isPending: boolean;
}

export const EventEditActions = React.memo(function EventEditActions({
  onCancel,
  isPending,
}: EventEditActionsProps) {
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
        id="event-submit"
        type="submit"
        disabled={isPending}
        className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
});
