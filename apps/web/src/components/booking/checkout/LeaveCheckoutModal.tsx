import { useFocusTrap } from '@mad/ui';

interface LeaveCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LeaveCheckoutModal({ isOpen, onClose, onConfirm }: LeaveCheckoutModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-modal-title"
        className="w-full max-w-sm bg-[#0d111d] rounded-2xl border border-white/10 p-6 space-y-6 text-center shadow-2xl relative z-10 focus:outline-none"
      >
        <div className="space-y-2">
          <h2 id="leave-modal-title" className="text-xl font-bold text-white">Leave Checkout?</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Are you sure you want to leave checkout? The items you've selected may not be available later.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-colors"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-bold text-sm transition-colors shadow-glow"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
