'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { PopupForm } from '@/components/forms/PopupForm';
import { adminCreatePopup } from '@/lib/api/admin/popup.service';
import { extractApiError } from '@/lib/api/client';
import { PopupMutationPayload } from '@/types/popup-form';

export default function CreatePopupPage() {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (payload: PopupMutationPayload) => adminCreatePopup(payload),
    onSuccess: () => router.push('/popups'),
  });

  return (
    <PopupForm
      mode="create"
      isSubmitting={createMutation.isPending}
      serverError={createMutation.error ? extractApiError(createMutation.error).message : ''}
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await createMutation.mutateAsync(payload);
      }}
    />
  );
}
