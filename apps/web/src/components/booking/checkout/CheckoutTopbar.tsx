'use client';

interface CheckoutTopbarProps {
  isModal?: boolean;
  timeLeft: string;
  isExpired: boolean;
  onBackClick: () => void;
  onCloseClick: () => void;
}

export function CheckoutTopbar({
  isModal,
  timeLeft,
  isExpired,
  onBackClick,
  onCloseClick,
}: CheckoutTopbarProps) {
  return (
    <div
      className={
        isModal
          ? 'shrink-0 bg-background border-b border-white/10 py-1.5 px-3 sm:py-2 sm:px-4 z-30 shadow-sm'
          : 'fixed top-0 left-0 right-0 bg-background border-b border-white/10 py-2 px-4 z-50 shadow-md'
      }
    >
      <div className="container-mad max-w-4xl flex items-center justify-between">
        <button
          type="button"
          onClick={onBackClick}
          className="w-8 h-8 rounded-full hover:bg-white/10 border border-white/10 flex items-center justify-center text-white text-base transition-colors shrink-0"
          aria-label="Go back"
        >
          ←
        </button>

        <div className="text-center min-w-0 flex-1 px-2">
          <h1 id="checkout-modal-title" className="text-xs md:text-sm font-bold text-white tracking-wide truncate">
            Checkout
          </h1>
          <div
            className={`text-[10px] font-semibold ${
              isExpired ? 'text-red-400' : 'text-accent-cyan animate-pulse'
            }`}
          >
            {timeLeft}
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseClick}
          className="w-8 h-8 rounded-full hover:bg-white/10 border border-white/10 flex items-center justify-center text-white text-xs transition-colors shrink-0"
          aria-label="Close checkout"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
