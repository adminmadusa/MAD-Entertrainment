'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { PopupForm } from '@/components/forms/PopupForm';
import { adminGetPopup, adminUpdatePopup } from '@/lib/api/admin/popup.service';
import { extractApiError } from '@/lib/api/client';
import { PopupMutationPayload } from '@/types/popup-form';

export default function EditPopupPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const { data: popup, isLoading } = useQuery({
    queryKey: ['admin-popup', id],
    queryFn: () => adminGetPopup(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PopupMutationPayload) => adminUpdatePopup(id, payload),
    onSuccess: () => router.push('/popups'),
  });

  if (isLoading || !popup) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">Loading campaign details...</div>
      </div>
    );
  }

  return (
    <PopupForm
      mode="edit"
      initialPopup={popup}
      isSubmitting={updateMutation.isPending}
      serverError={updateMutation.error ? extractApiError(updateMutation.error).message : ''}
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await updateMutation.mutateAsync(payload);
      }}
    />
  );
}
