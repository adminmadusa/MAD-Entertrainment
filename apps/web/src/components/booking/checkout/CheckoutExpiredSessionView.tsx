'use client';

interface CheckoutExpiredSessionViewProps {
  onClose?: () => void;
}

export function CheckoutExpiredSessionView({ onClose }: CheckoutExpiredSessionViewProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 px-4 py-12 text-center bg-transparent">
      <div className="text-white font-bold text-lg">Booking Session Expired</div>
      <p className="text-text-muted text-sm max-w-md">
        We couldn't find your booking details. It may have expired due to inactivity. Please select tickets again.
      </p>
      <button
        onClick={onClose}
        className="px-6 py-3 btn-gradient text-white rounded-xl font-bold text-sm shadow-glow-sm transition-transform active:scale-95 cursor-pointer"
      >
        Start New Booking
      </button>
    </div>
  );
}
