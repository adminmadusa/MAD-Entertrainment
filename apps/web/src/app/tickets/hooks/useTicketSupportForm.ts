'use client';

import { useState } from 'react';
import { submitContactForm } from '@/app/actions/contact.actions';

interface UseTicketSupportFormProps {
  onSuccessMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

export function useTicketSupportForm({
  onSuccessMessage,
  onErrorMessage,
}: UseTicketSupportFormProps) {
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportRef, setSupportRef] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportStatus, setSupportStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>(
    'idle'
  );
  const [supportError, setSupportError] = useState('');

  const handleSupportFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportStatus('submitting');
    setSupportError('');
    onSuccessMessage('Submitting support request...');

    const formData = new FormData();
    formData.append('name', supportName);
    formData.append('email', supportEmail);
    formData.append('issueType', 'ticket');
    formData.append('bookingRef', supportRef);
    formData.append('message', supportMessage);

    try {
      const result = await submitContactForm(formData);
      if (result.success) {
        setSupportStatus('success');
        onSuccessMessage('Support request submitted successfully.');
        setSupportName('');
        setSupportEmail('');
        setSupportRef('');
        setSupportMessage('');
      } else {
        setSupportStatus('error');
        const err = result.message || 'Failed to submit. Please try again.';
        setSupportError(err);
        onErrorMessage('Support request submission failed.');
      }
    } catch (_err) {
      setSupportStatus('error');
      setSupportError('Failed to connect to the support server.');
      onErrorMessage('Support request submission failed.');
    }
  };

  return {
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
    handleSupportFormSubmit,
  };
}
