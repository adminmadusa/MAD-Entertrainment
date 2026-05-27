'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { CouponForm } from '@/components/forms/CouponForm';
import { adminGetCoupon, adminUpdateCoupon } from '@/lib/api/admin/coupon.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { CouponMutationPayload } from '@/types/coupon-form';

export default function EditCouponPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: coupon, isLoading } = useQuery({
    queryKey: ['admin-coupon', id],
    queryFn: () => adminGetCoupon(id),
    enabled: !!id,
  });

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CouponMutationPayload) => adminUpdateCoupon(id, payload),
    onSuccess: () => router.push('/coupons'),
  });

  if (isLoading || !coupon) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">Loading coupon details...</div>
      </div>
    );
  }

  return (
    <CouponForm
      mode="edit"
      initialCoupon={coupon}
      events={eventsData?.items ?? []}
      isLoadingEvents={isLoadingEvents}
      isSubmitting={updateMutation.isPending}
      serverError={updateMutation.error ? extractApiError(updateMutation.error).message : ''}
      onBack={() => router.back()}
      onSubmitPayload={async (payload) => {
        await updateMutation.mutateAsync(payload);
      }}
    />
  );
}
