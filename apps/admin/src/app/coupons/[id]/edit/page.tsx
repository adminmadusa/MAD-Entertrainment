'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

import { adminGetCoupon, adminUpdateCoupon } from '@/lib/api/admin/coupon.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { CouponForm } from '@/components/coupons/CouponForm';
import { buildUpdateCouponPayload } from '@/components/coupons/coupon-form.types';

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [error, setError] = useState('');

  const { data: coupon, isLoading: isLoadingCoupon } = useQuery({
    queryKey: ['admin-coupon', id],
    queryFn: () => adminGetCoupon(id),
    enabled: !!id,
  });

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => adminUpdateCoupon(id, payload),
    onSuccess: () => router.push('/coupons'),
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.errors) {
        const details = Object.entries(apiErr.errors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join('; ');
        setError(`Validation failed — ${details}`);
      } else {
        setError(apiErr.message);
      }
    },
  });

  if (isLoadingCoupon) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">Loading coupon details...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Edit Coupon</h1>
          <p className="text-text-muted text-sm mt-0.5">Modify parameters for coupon {coupon?.code}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <CouponForm
        initialData={coupon}
        onSubmit={(state) => {
          setError('');
          updateMutation.mutate(buildUpdateCouponPayload(state));
        }}
        isPending={updateMutation.isPending}
        apiError={error}
        events={eventsData?.items ?? []}
        isLoadingEvents={isLoadingEvents}
      />
    </div>
  );
}
