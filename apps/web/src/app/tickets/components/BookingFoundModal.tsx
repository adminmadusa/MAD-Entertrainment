'use client';

import React, { useRef, useEffect, useCallback } from 'react';

import { Modal, ArrowLeft } from '@mad/ui';
import { ArrowRight, AlertCircle, RefreshCw } from '@mad/ui/icons';

export interface BookingFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
  foundEmail: string;
  errorMsg: string;
  handleSendOtp: () => void;
  handleResendOtp?: () => void;
  cooldown?: number;
  isSubmitting: boolean;
  renderGoogleButton?: (container: HTMLElement) => void;
  gsiLoaded?: boolean;
}

export function BookingFoundModal({
  isOpen,
  onClose,
  onGoBack,
  foundEmail,
  errorMsg,
  handleSendOtp,
  handleResendOtp,
  cooldown = 0,
  isSubmitting,
  renderGoogleButton,
  gsiLoaded = false,
}: BookingFoundModalProps) {
  const googleDivRef = useRef<HTMLDivElement>(null);

  const mountGoogleButton = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        googleDivRef.current = node;
        if (gsiLoaded && renderGoogleButton) {
          renderGoogleButton(node);
        }
      }
    },
    [gsiLoaded, renderGoogleButton]
  );

  useEffect(() => {
    if (isOpen && gsiLoaded && googleDivRef.current && renderGoogleButton) {
      renderGoogleButton(googleDivRef.current);
    }
  }, [isOpen, gsiLoaded, renderGoogleButton]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
      closeOnBackdropClick={true}
      enableSwipeToClose={true}
      presentation="bottom-sheet"
      ariaLabelledBy="found-title"
      ariaDescribedBy="found-desc"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 id="found-title" className="text-xl font-black text-white">
            Booking Found!
          </h2>
        </div>

        <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-center space-y-2.5">
          <p id="found-desc" className="text-text-secondary text-xs leading-relaxed">
            We found your ticket booking under:
          </p>
          <p className="text-white font-mono font-bold text-sm bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 break-all select-all selection:bg-accent-purple/50">
            {foundEmail}
          </p>
          <p className="text-text-muted text-[11px] leading-relaxed">
            A 6-digit passcode was sent to your email. Enter it below to unlock your tickets.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" aria-live="assertive" className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-medium py-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={isSubmitting}
            aria-label="Enter verification code"
            className="w-full py-3.5 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Enter 6-Digit Passcode</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {handleResendOtp && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSubmitting || cooldown > 0}
                className="text-xs text-text-muted hover:text-accent-purple-light transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive code? Resend"}</span>
              </button>
            </div>
          )}

          <div className="flex items-center pt-1">
            <div className="flex-grow border-t border-border-subtle" />
            <span className="mx-4 text-xs font-bold text-text-muted uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-border-subtle" />
          </div>

          <div className="space-y-2">
            <div
              ref={mountGoogleButton}
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
