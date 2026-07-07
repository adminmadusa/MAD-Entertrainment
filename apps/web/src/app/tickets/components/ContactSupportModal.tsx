'use client';

import React from 'react';

import { Modal, ArrowLeft } from '@mad/ui';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
  supportName: string;
  setSupportName: (val: string) => void;
  supportEmail: string;
  setSupportEmail: (val: string) => void;
  supportRef: string;
  setSupportRef: (val: string) => void;
  supportMessage: string;
  setSupportMessage: (val: string) => void;
  supportStatus: 'idle' | 'submitting' | 'success' | 'error';
  setSupportStatus: (val: 'idle' | 'submitting' | 'success' | 'error') => void;
  supportError: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function ContactSupportModal({
  isOpen,
  onClose,
  onGoBack,
  supportName,
  setSupportName,
  supportEmail,
  setSupportEmail,
  supportRef,
  setSupportRef,
  supportMessage,
  setSupportMessage,
  supportStatus,
  setSupportStatus,
  supportError,
  onSubmit,
}: ContactSupportModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={true}
      enableSwipeToClose={true}
      ariaLabelledBy="support-title"
      ariaDescribedBy="support-desc"
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
          <h2 id="support-title" className="text-xl font-black text-white">
            Contact Support
          </h2>
        </div>

        <p id="support-desc" className="text-text-secondary text-xs leading-relaxed">
          Need help retrieving your tickets? Fill out this request and our support team will contact you shortly.
        </p>

        {supportStatus === 'success' ? (
          <div className="bg-accent-purple/15 border border-accent-purple/35 rounded-2xl p-6 text-center space-y-3 animate-in fade-in duration-300">
            <span className="text-3xl block">✅</span>
            <h3 className="text-white font-bold text-base">Request Submitted</h3>
            <p className="text-text-secondary text-xs leading-relaxed">
              Thank you! Your request was received. We will check the booking details and contact you via email soon.
            </p>
            <button
              type="button"
              onClick={() => setSupportStatus('idle')}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold rounded-xl transition-all"
            >
              Send Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {supportStatus === 'error' && (
              <div role="alert" aria-live="assertive" className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 font-medium">
                {supportError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="supportName" className="text-xs font-semibold text-text-secondary block">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="supportName"
                type="text"
                required
                value={supportName}
                onChange={(e) => setSupportName(e.target.value)}
                placeholder="e.g. John Doe"
                disabled={supportStatus === 'submitting'}
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-3.5 py-2.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supportEmail" className="text-xs font-semibold text-text-secondary block">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="supportEmail"
                type="email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                disabled={supportStatus === 'submitting'}
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-3.5 py-2.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supportRef" className="text-xs font-semibold text-text-secondary block">
                Booking Reference / Transaction ID
              </label>
              <input
                id="supportRef"
                type="text"
                value={supportRef}
                onChange={(e) => setSupportRef(e.target.value)}
                placeholder="e.g. MAD-YYYY-XXXXX or pay_xxxx"
                disabled={supportStatus === 'submitting'}
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-3.5 py-2.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple font-mono transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supportMessage" className="text-xs font-semibold text-text-secondary block">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="supportMessage"
                required
                rows={4}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Tell us what issues you are experiencing..."
                disabled={supportStatus === 'submitting'}
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-3.5 py-2.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple resize-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={supportStatus === 'submitting'}
              aria-label="Submit support request"
              className="w-full py-3.5 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {supportStatus === 'submitting' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
