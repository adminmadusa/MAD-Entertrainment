'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminGetTicketProfile, adminCreateTicketProfile, adminUpdateTicketProfile } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';
import { Spinner } from '@mad/ui';

import { TicketProfileForm } from './TicketProfileForm';

interface TicketProfileFormContainerProps {
  mode: 'create' | 'edit';
  profileId?: string;
}

export function TicketProfileFormContainer({ mode, profileId }: TicketProfileFormContainerProps) {
  const router = useRouter();
  const [error, setError] = useState('');

  // 1. Fetch Tiers (Always needed)
  const { data: dbTiers = [] } = useQuery({
    queryKey: ['adminTiers'],
    queryFn: adminGetTiers,
  });

  // 2. Fetch Ticket Profile (Only in Edit Mode)
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['admin-ticket-profile', profileId],
    queryFn: () => adminGetTicketProfile(profileId!),
    enabled: mode === 'edit' && !!profileId,
  });

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: adminCreateTicketProfile,
    onSuccess: () => router.push('/ticket-management'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => adminUpdateTicketProfile(profileId!, payload),
    onSuccess: () => router.push('/ticket-management'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const isPending = mode === 'create' ? createMutation.isPending : updateMutation.isPending;

  if (mode === 'edit' && isLoadingProfile) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Spinner size="lg" className="text-accent-purple" aria-label="Loading ticket profile" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            {mode === 'create' ? 'Create Ticket Profile' : 'Edit Ticket Profile'}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {mode === 'create'
              ? 'Define reusable event ticket templates'
              : 'Modify centralized event ticket template'}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <TicketProfileForm
        initialData={mode === 'edit' ? profile : undefined}
        onSubmit={(payload) => {
          setError('');
          if (mode === 'create') {
            createMutation.mutate(payload);
          } else {
            updateMutation.mutate(payload);
          }
        }}
        isPending={isPending}
        apiError={error}
        dbTiers={dbTiers}
      />
    </div>
  );
}
