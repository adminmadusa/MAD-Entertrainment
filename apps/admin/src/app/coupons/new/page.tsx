'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { CouponForm } from '@/components/forms/CouponForm';
import { useFormMutation } from '@/hooks/forms/core';
import { adminCreateCoupon } from '@/lib/api/admin/coupon.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { CouponMutationPayload } from '@/types/coupon-form';

export default function CreateCouponPage() {
  const router = useRouter();

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  const createMutation = useFormMutation<CouponMutationPayload, Awaited<ReturnType<typeof adminCreateCoupon>>>({
    mutationFn: (payload) => adminCreateCoupon(payload),
    redirectTo: '/coupons',
  });

  return (
    <CouponForm
      mode="create"
      events={eventsData?.items ?? []}
      isLoadingEvents={isLoadingEvents}
      isSubmitting={createMutation.isPending}
      serverError={createMutation.serverError}
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await createMutation.submit(payload);
      }}
    />
  );
}
