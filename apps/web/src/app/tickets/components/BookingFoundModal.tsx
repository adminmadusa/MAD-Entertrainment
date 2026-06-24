'use client';

import React from 'react';
import { Modal, ArrowLeft } from '@mad/ui';

interface BookingFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
  foundEmail: string;
  errorMsg: string;
  handleSendOtp: () => void;
  isSubmitting: boolean;
  googleBtnRef: React.RefObject<HTMLDivElement>;
}

export function BookingFoundModal({
  isOpen,
  onClose,
  onGoBack,
  foundEmail,
  errorMsg,
  handleSendOtp,
  isSubmitting,
  googleBtnRef,
}: BookingFoundModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={true}
      enableSwipeToClose={true}
      ariaLabelledBy="found-title"
      ariaDescribedBy="found-desc"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 id="found-title" className="text-xl font-black text-white">
            Booking Found!
          </h2>
        </div>

        <div className="p-5 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-center space-y-3">
          <p id="found-desc" className="text-text-secondary text-xs leading-relaxed">
            We found your ticket booking under the following email address:
          </p>
          <p className="text-white font-mono font-bold text-sm bg-white/5 border border-white/10 rounded-xl py-3 px-4 break-all select-all selection:bg-accent-purple/50">
            {foundEmail}
          </p>
          <p className="text-text-muted text-[10px] leading-relaxed">
            Please verify ownership using OTP or Google authentication to access your tickets.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" aria-live="assertive" className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center font-medium">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={isSubmitting}
            aria-label="Send OTP code"
            className="w-full py-3.5 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            Send OTP Code
          </button>

          <div className="flex items-center">
            <div className="flex-grow border-t border-border-subtle/30" />
            <span className="mx-4 text-xs font-bold text-text-muted/40 uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-border-subtle/30" />
          </div>

          <div className="space-y-3">
            <div
              ref={googleBtnRef}
              id="google-signin-btn-found"
              className="w-full min-h-[44px] flex justify-center items-center overflow-hidden hover:opacity-90 active:scale-98 transition-all duration-200"
            />
            {isSubmitting && (
              <p className="text-center text-xs text-purple-300/80 animate-pulse">
                Authenticating...
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
