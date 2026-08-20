'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';

import { EventForm, type EventFormHandle } from '@/components/events/EventForm';
import { adminGetEvent, adminUpdateEvent } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { Button, Stepper } from '@mad/ui';

const STEPS = [
  'Basic Information',
  'Schedule',
  'Ticket Configuration',
  'Media Uploads',
  'Review & Save'
];

export default function EditEventPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const formRef = useRef<EventFormHandle>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');

  // Fetch Event details
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['admin-event', id],
    queryFn: () => adminGetEvent(id)
  });

  React.useEffect(() => {
    if (event && event.lifecycle === 'COMPLETED') {
      router.replace(`/events/${id}/gallery`);
    }
  }, [event, id, router]);

  const isSubmitting = useRef(false);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => adminUpdateEvent(id, payload),
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

    if (formRef.current?.validateStep(4) && event) {
      try {
        const payload = formRef.current.getPayload();

        // Immutable payload transformation for Edit updates
        const updatePayload = {
          ...payload,
          ticketTiers: payload.ticketProfileId ? [] : payload.ticketTiers,
          ticketProfileId: payload.ticketProfileId ? payload.ticketProfileId : null,
          ticketOverrides: payload.ticketProfileId ? payload.ticketOverrides : [],
          eventVersion: event.eventVersion,
        };

        isSubmitting.current = true;
        updateMutation.mutate(updatePayload);
      } catch (err) {
        isSubmitting.current = false;
        setError(extractApiError(err).message || 'Failed to update event');
      }
    }
  };

  if (isEventLoading || (event && event.lifecycle === 'COMPLETED')) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-purple" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-text-muted text-sm">Event not found or has been deleted.</p>
        <button
          onClick={() => router.push('/events')}
          className="px-4 py-2 text-sm rounded-xl bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20 transition-colors"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Edit Event</h1>
          <p className="text-text-muted text-sm mt-0.5">Modify event details and ticketing</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>


      <div className="px-4 py-6 bg-surface border border-border-subtle rounded-xl mb-8">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      <EventForm
        ref={formRef}
        initialValues={event}
        activeStep={currentStep}
        onEditStep={setCurrentStep}
        error={error}
      />

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
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
