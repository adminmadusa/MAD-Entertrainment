'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { TicketProfileForm } from '@/components/forms/TicketProfileForm';
import { adminCreateTicketProfile } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';
import { TicketProfileMutationPayload } from '@/types/ticket-profile-form';

export default function CreateTicketProfilePage() {
  const router = useRouter();
  const { data: dbTiers = [] } = useQuery({
    queryKey: ['adminTiers'],
    queryFn: adminGetTiers,
  });

  const createMutation = useMutation({
    mutationFn: (payload: TicketProfileMutationPayload) => adminCreateTicketProfile(payload),
    onSuccess: () => router.push('/ticket-profiles'),
  });

  return (
    <TicketProfileForm
      mode="create"
      tiers={dbTiers}
      isSubmitting={createMutation.isPending}
      serverError={createMutation.error ? extractApiError(createMutation.error).message : ''}
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await createMutation.mutateAsync(payload);
      }}
    />
  );
}
