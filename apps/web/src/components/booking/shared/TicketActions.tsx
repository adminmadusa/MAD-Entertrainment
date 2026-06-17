interface TicketActionsProps {
  downloading?: boolean;
  resending?: boolean;
  cooldown?: number;
  /** Callback to trigger secure One-Time Download Token (OTD) PDF download flow */
  onDownload: () => void;
  onResend: () => void;
}

export function TicketActions({
  downloading,
  resending,
  cooldown,
  onDownload,
  onResend,
}: TicketActionsProps) {
  const isResendingCooldown = cooldown !== undefined && cooldown > 0;

  let resendAriaLabel = 'Resend tickets to your email';
  if (resending) {
    resendAriaLabel = 'Sending tickets to your email';
  } else if (isResendingCooldown) {
    resendAriaLabel = `Resend available in ${cooldown} seconds`;
  }

  const getResendButtonStyles = () => {
    if (resending) {
      return 'bg-white/5 border border-white/10 text-white/60 cursor-not-allowed';
    }
    if (isResendingCooldown) {
      return 'bg-white/5 border border-white/5 text-white/40 cursor-not-allowed';
    }
    return 'btn-gradient text-white font-semibold shadow-glow-sm hover:scale-[1.02] active:scale-[0.98]';
  };

  const renderResendButtonContent = () => {
    if (resending) {
      return (
        <>
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Sending...
        </>
      );
    }
    if (isResendingCooldown) {
      return `Wait ${cooldown}s`;
    }
    return (
      <>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Resend Tickets
      </>
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        aria-label={downloading ? 'Downloading ticket PDF' : 'Download ticket PDF'}
        className="min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 border border-border-subtle text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
      >
        {downloading ? (
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        {downloading ? 'Downloading...' : 'Download PDF'}
      </button>

      <button
        type="button"
        onClick={onResend}
        disabled={resending || isResendingCooldown}
        aria-label={resendAriaLabel}
        className={`min-h-[44px] px-4 py-2 text-xs rounded-xl transition-all flex items-center gap-1.5 ${getResendButtonStyles()}`}
      >
        {renderResendButtonContent()}
      </button>
    </div>
  );
}
