import { Modal } from '@mad/ui';

interface LeaveCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LeaveCheckoutModal({ isOpen, onClose, onConfirm }: LeaveCheckoutModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnBackdropClick={true}
      ariaLabelledBy="leave-modal-title"
      className="max-w-[340px] p-5 bg-background border border-white/10 rounded-2xl shadow-2xl z-50"
    >
      <div className="text-center space-y-4">
        <div className="space-y-1">
          <h2 id="leave-modal-title" className="text-base font-bold text-white">Leave Checkout?</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Your reserved tickets will be released if you leave checkout now.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>
    </Modal>
  );
}
