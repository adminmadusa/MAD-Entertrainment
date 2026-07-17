'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';

import { EventForm, type EventFormHandle } from '@/components/events/EventForm';
import { adminCreateEvent } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { Button, Stepper } from '@mad/ui';

const STEPS = [
  'Basic Information',
  'Schedule',
  'Ticket Configuration',
  'Media Uploads',
  'Review & Publish'
];

export default function CreateEventPage() {
  const router = useRouter();
  const formRef = useRef<EventFormHandle>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');

  const isSubmitting = useRef(false);

  const createMutation = useMutation({
    mutationFn: adminCreateEvent,
    onSuccess: () => router.push('/events'),
    onError: (err) => setError(extractApiError(err).message),
    onSettled: () => {
      isSubmitting.current = false;
    },
  });

  const handleNext = () => {
    setError('');
    if (formRef.current?.validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setError('');
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting.current) return;
    setError('');

    if (!formRef.current?.validateStep(4)) return;

    try {
      const payload = formRef.current.getPayload();
      isSubmitting.current = true;
      createMutation.mutate(payload);
    } catch (err) {
      isSubmitting.current = false;
      setError(extractApiError(err).message || 'Failed to handle event creation');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Create Event</h1>
          <p className="text-text-muted text-sm mt-0.5">Fill in the details below</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Cancel
        </button>
      </div>

      <div className="px-4 py-6 bg-surface border border-border-subtle rounded-xl mb-8">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      <EventForm ref={formRef} activeStep={currentStep} onEditStep={setCurrentStep} error={error} />

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background border-t border-border z-40 lg:left-64">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? () => router.back() : handlePrev}
          >
            {currentStep === 0 ? 'Cancel' : 'Previous'}
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button type="button" variant="primary" onClick={handleNext}>
              Next Step
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Publishing...' : 'Review & Publish'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
