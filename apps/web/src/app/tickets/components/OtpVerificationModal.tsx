'use client';

import React from 'react';
import { Modal, ArrowLeft } from '@mad/ui';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
  foundEmail: string;
  errorMsg: string;
  infoMsg: string;
  otpInput: string;
  setOtpInput: (val: string) => void;
  isSubmitting: boolean;
  cooldown: number;
  onSubmit: (e: React.FormEvent) => void;
  handleResendOtp: () => void;
}

export function OtpVerificationModal({
  isOpen,
  onClose,
  onGoBack,
  foundEmail,
  errorMsg,
  infoMsg,
  otpInput,
  setOtpInput,
  isSubmitting,
  cooldown,
  onSubmit,
  handleResendOtp,
}: OtpVerificationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={true}
      enableSwipeToClose={true}
      ariaLabelledBy="otp-title"
      ariaDescribedBy="otp-desc"
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
          <h2 id="otp-title" className="text-xl font-black text-white">
            Verification Required
          </h2>
        </div>

        <div className="text-center">
          <p id="otp-desc" className="text-text-secondary text-sm leading-relaxed">
            Enter the 6-digit verification code sent to <span className="text-white font-semibold">{foundEmail}</span>
          </p>
        </div>

        {errorMsg && (
          <div role="alert" aria-live="assertive" className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center font-medium">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div role="status" aria-live="polite" className="p-3.5 bg-accent-purple/10 border border-accent-purple/30 rounded-xl text-xs text-purple-300 text-center font-medium">
            {infoMsg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="otp" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block text-center">
              6-Digit Passcode
            </label>
            <input
              id="otp"
              type="text"
              required
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              disabled={isSubmitting}
              aria-invalid={!!errorMsg}
              aria-describedby={errorMsg ? "otp-error" : undefined}
              className="w-full text-center font-black bg-white/5 border border-border-subtle rounded-2xl text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-300 font-mono text-2xl sm:text-3xl py-3 tracking-[0.3em] pl-[0.3em]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting || otpInput.length !== 6}
              aria-label="Verify OTP"
              className="flex-grow py-3.5 px-5 btn-gradient text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0 || isSubmitting}
              aria-label="Resend OTP code"
              className="flex-grow py-3.5 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
