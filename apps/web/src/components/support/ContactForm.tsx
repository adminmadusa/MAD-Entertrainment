'use client';

import { useState } from 'react';
import { submitContactForm } from '@/app/actions/contact.actions';

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [issueType, setIssueType] = useState('general');

  const showBookingRef = ['ticket', 'refund'].includes(issueType);
  const showTransactionId = ['payment', 'refund'].includes(issueType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);

    try {
      const result = await submitContactForm(formData);
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('Failed to connect to the support server. Please try again later.');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-3xl p-10 text-center space-y-4">
        <div className="w-16 h-16 bg-accent-purple/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">✅</span>
        </div>
        <h3 className="text-white font-bold text-2xl">Message Sent</h3>
        <p className="text-text-secondary">
          Thank you for reaching out. Our support team has received your message and will get back to you via email shortly.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="btn-gradient text-white px-6 py-2 rounded-full text-sm font-semibold mt-4"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-white text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={status === 'submitting'}
            className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors disabled:opacity-50"
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-white text-sm font-medium">Email Address <span className="text-red-500">*</span></label>
          <input
            type="email"
            id="email"
            name="email"
            required
            disabled={status === 'submitting'}
            className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors disabled:opacity-50"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="issueType" className="text-white text-sm font-medium">Issue Type <span className="text-red-500">*</span></label>
        <select
          id="issueType"
          name="issueType"
          required
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          disabled={status === 'submitting'}
          className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors appearance-none disabled:opacity-50"
        >
          <option value="general" className="bg-bg-secondary">General Inquiry</option>
          <option value="ticket" className="bg-bg-secondary">Ticket Issue</option>
          <option value="payment" className="bg-bg-secondary">Payment Issue</option>
          <option value="refund" className="bg-bg-secondary">Refund Request</option>
          <option value="event" className="bg-bg-secondary">Event Question</option>
          <option value="account" className="bg-bg-secondary">Account Question</option>
        </select>
      </div>

      {(showBookingRef || showTransactionId) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-4 rounded-xl border border-border-subtle/50">
          <div className={`space-y-2 ${!showBookingRef && 'opacity-50 pointer-events-none hidden md:block'}`}>
            <label htmlFor="bookingRef" className="text-white text-sm font-medium flex items-center justify-between">
              Booking Reference
              <span className="text-text-muted text-xs font-normal text-right">Optional</span>
            </label>
            <input
              type="text"
              id="bookingRef"
              name="bookingRef"
              disabled={status === 'submitting' || !showBookingRef}
              className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors disabled:opacity-50"
              placeholder="e.g. MAD-2026-ABC123"
            />
          </div>

          <div className={`space-y-2 ${!showTransactionId && 'opacity-50 pointer-events-none hidden md:block'}`}>
            <label htmlFor="transactionId" className="text-white text-sm font-medium flex items-center justify-between">
              Transaction ID
              <span className="text-text-muted text-xs font-normal text-right">Optional</span>
            </label>
            <input
              type="text"
              id="transactionId"
              name="transactionId"
              disabled={status === 'submitting' || !showTransactionId}
              className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors disabled:opacity-50"
              placeholder="e.g. pay_Qwerty123456"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="message" className="text-white text-sm font-medium">Message <span className="text-red-500">*</span></label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          disabled={status === 'submitting'}
          className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors resize-y text-[16px] disabled:opacity-50"
          placeholder="How can we help you?"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full btn-gradient text-white py-4 rounded-xl font-bold text-lg shadow-glow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-70 disabled:hover:scale-100 flex justify-center items-center gap-2"
      >
        {status === 'submitting' ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </button>

      <p className="text-center text-text-muted text-xs">
        By submitting this form, you agree to our <a href="/legal/privacy" className="text-accent-purple hover:underline">Privacy Policy</a>.
      </p>
    </form>
  );
}
