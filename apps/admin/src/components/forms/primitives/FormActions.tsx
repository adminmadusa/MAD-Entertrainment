export function FormActions({
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 pb-6">
      <button
        type="button"
        onClick={onCancel}
        className="w-full sm:flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        id="event-submit"
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple transition-colors"
      >
        {submitLabel}
      </button>
    </div>
  );
}
