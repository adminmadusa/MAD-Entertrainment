'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { EventForm } from '@/components/forms/EventForm';
import { adminGetCategories } from '@/lib/api/admin/category.service';
import { adminGetEvent, adminUpdateEvent } from '@/lib/api/admin/event.service';
import { adminGetTicketProfiles } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';
import { EventMutationPayload } from '@/types/event-form';

export default function EditEventPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: event, isLoading } = useQuery({
    queryKey: ['admin-event', id],
    queryFn: () => adminGetEvent(id),
  });
  const { data: categories = [] } = useQuery({ queryKey: ['adminCategories'], queryFn: adminGetCategories });
  const { data: tiers = [] } = useQuery({ queryKey: ['adminTiers'], queryFn: adminGetTiers });
  const { data: profiles = [] } = useQuery({ queryKey: ['adminTicketProfiles'], queryFn: adminGetTicketProfiles });

  const updateMutation = useMutation({
    mutationFn: (payload: EventMutationPayload) => adminUpdateEvent(id, payload),
    onSuccess: () => router.push('/events'),
  });

  if (isLoading || !event) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-purple" />
      </div>
    );
  }

  return (
    <EventForm
      mode="edit"
      initialEvent={event}
      categories={categories}
      tiers={tiers}
      profiles={profiles}
      isSubmitting={updateMutation.isPending}
      serverError={updateMutation.error ? extractApiError(updateMutation.error).message : ''}
      onSubmitPayload={async (payload) => {
        await updateMutation.mutateAsync(payload);
      }}
      onBack={() => router.back()}
    />
  );
}
