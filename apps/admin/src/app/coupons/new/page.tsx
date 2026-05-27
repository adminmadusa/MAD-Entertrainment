'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { CouponForm } from '@/components/forms/CouponForm';
import { adminCreateCoupon } from '@/lib/api/admin/coupon.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { CouponMutationPayload } from '@/types/coupon-form';

export default function CreateCouponPage() {
  const router = useRouter();

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CouponMutationPayload) => adminCreateCoupon(payload),
    onSuccess: () => router.push('/coupons'),
  });

  return (
    <CouponForm
      mode="create"
      events={eventsData?.items ?? []}
      isLoadingEvents={isLoadingEvents}
      isSubmitting={createMutation.isPending}
      serverError={createMutation.error ? extractApiError(createMutation.error).message : ''}
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await createMutation.mutateAsync(payload);
      }}
    />
  );
}
