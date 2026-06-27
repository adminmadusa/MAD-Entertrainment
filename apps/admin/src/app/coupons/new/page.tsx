'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminCreateCoupon } from '@/lib/api/admin/coupon.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { CouponForm } from '@/components/coupons/CouponForm';
import { buildCreateCouponPayload } from '@/components/coupons/coupon-form.types';

export default function CreateCouponPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: adminCreateCoupon,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Create Coupon</h1>
          <p className="text-text-muted text-sm mt-0.5">Configure a new discount coupon code</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <CouponForm
        onSubmit={(state) => {
          setError('');
          createMutation.mutate(buildCreateCouponPayload(state));
        }}
        isPending={createMutation.isPending}
        apiError={error}
        events={eventsData?.items ?? []}
        isLoadingEvents={isLoadingEvents}
      />
    </div>
  );
}
