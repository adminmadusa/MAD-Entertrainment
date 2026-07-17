'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';

import { EventForm, type EventFormHandle } from '@/components/events/EventForm';
import { EventAttendanceCard } from '@/components/events/EventAttendanceCard';
import { adminGetEvent, adminUpdateEvent } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { AdminFormActions } from '@mad/ui';

export default function EditEventPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const formRef = useRef<EventFormHandle>(null);

  const [error, setError] = useState('');

  // Fetch Event details
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['admin-event', id],
    queryFn: () => adminGetEvent(id)
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => adminUpdateEvent(id, payload),
    onSuccess: () => router.push('/events'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formRef.current?.validateAll() && event) {
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

        updateMutation.mutate(updatePayload);
      } catch (err) {
        setError(extractApiError(err).message || 'Failed to update event');
      }
    }
  };

  if (isEventLoading) {
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
    <div className="max-w-3xl mx-auto space-y-6 text-white pb-12">
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

      <EventAttendanceCard event={event} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <EventForm ref={formRef} initialValues={event} error={error} />

        <AdminFormActions
          onCancel={() => router.back()}
          isPending={updateMutation.isPending}
          submitLabel="Save Changes"
          pendingLabel="Saving..."
          submitId="event-submit"
        />
      </form>
    </div>
  );
}
