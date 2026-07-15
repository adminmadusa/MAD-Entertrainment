'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminCreatePopup, adminGetPopup, adminUpdatePopup } from '@/lib/api/admin/popup.service';
import { extractApiError } from '@/lib/api/client';

import { buildPopupPayload } from './popup-form.utils';
import { PopupForm } from './PopupForm';

interface PopupFormContainerProps {
  mode: 'create' | 'edit';
  popupId?: string;
}

export function PopupFormContainer({ mode, popupId }: PopupFormContainerProps) {
  const router = useRouter();
  const [error, setError] = useState('');

  // 1. Fetch Popup (Only in Edit Mode)
  const { data: popup, isLoading: isLoadingPopup } = useQuery({
    queryKey: ['admin-popup', popupId],
    queryFn: () => adminGetPopup(popupId!),
    enabled: mode === 'edit' && !!popupId,
  });

  // 2. Mutation handlers
  const createMutation = useMutation({
    mutationFn: adminCreatePopup,
    onSuccess: () => router.push('/popups'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => adminUpdatePopup(popupId!, payload),
    onSuccess: () => router.push('/popups'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const isPending = mode === 'create' ? createMutation.isPending : updateMutation.isPending;

  if (mode === 'edit' && isLoadingPopup) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">Loading campaign details...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            {mode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {mode === 'create'
              ? 'Configure a new engagement popup banner'
              : `Modify parameters for campaign ${popup?.name}`}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <PopupForm
        initialData={mode === 'edit' ? popup : undefined}
        onSubmit={(state) => {
          setError('');
          const payload = buildPopupPayload(state);
          if (mode === 'create') {
            createMutation.mutate(payload);
          } else {
            updateMutation.mutate(payload);
          }
        }}
        isPending={isPending}
        apiError={error}
      />
    </div>
  );
}
