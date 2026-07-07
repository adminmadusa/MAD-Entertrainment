'use client';

import { useState } from 'react';
import { Alert, FormField, Input, Textarea } from '@mad/ui';

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
        <Alert variant="danger" className="animate-in fade-in duration-300">
          {errorMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Full Name" htmlFor="name" required>
          <Input
            type="text"
            id="name"
            name="name"
            required
            disabled={status === 'submitting'}
            placeholder="John Doe"
          />
        </FormField>

        <FormField label="Email Address" htmlFor="email" required>
          <Input
            type="email"
            id="email"
            name="email"
            required
            disabled={status === 'submitting'}
            placeholder="john@example.com"
          />
        </FormField>
      </div>

      <FormField label="Issue Type" htmlFor="issueType" required>
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
      </FormField>

      {(showBookingRef || showTransactionId) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-4 rounded-xl border border-border-subtle/50">
          {showBookingRef ? (
            <FormField label="Booking Reference" htmlFor="bookingRef" hint="Optional">
              <Input
                type="text"
                id="bookingRef"
                name="bookingRef"
                disabled={status === 'submitting'}
                placeholder="e.g. MAD-2026-ABC123"
              />
            </FormField>
          ) : (
            <div className="hidden md:block opacity-0 pointer-events-none" />
          )}

          {showTransactionId ? (
            <FormField label="Transaction ID" htmlFor="transactionId" hint="Optional">
              <Input
                type="text"
                id="transactionId"
                name="transactionId"
                disabled={status === 'submitting'}
                placeholder="e.g. pay_Qwerty123456"
              />
            </FormField>
          ) : (
            <div className="hidden md:block opacity-0 pointer-events-none" />
          )}
        </div>
      )}

      <FormField label="Message" htmlFor="message" required>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          disabled={status === 'submitting'}
          placeholder="How can we help you?"
        />
      </FormField>

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
