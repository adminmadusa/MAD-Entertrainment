'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminCreateCoupon, adminGetCoupon, adminUpdateCoupon } from '@/lib/api/admin/coupon.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';

import { buildCreateCouponPayload, buildUpdateCouponPayload } from './coupon-form.utils';
import { CouponForm } from './CouponForm';

interface CouponFormContainerProps {
  mode: 'create' | 'edit';
  couponId?: string;
}

export function CouponFormContainer({ mode, couponId }: CouponFormContainerProps) {
  const router = useRouter();
  const [error, setError] = useState('');

  // 1. Fetch Coupon (Only in Edit Mode)
  const { data: coupon, isLoading: isLoadingCoupon } = useQuery({
    queryKey: ['admin-coupon', couponId],
    queryFn: () => adminGetCoupon(couponId!),
    enabled: mode === 'edit' && !!couponId,
  });

  // 2. Fetch Events (Always needed for both)
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  // 3. Mutation handlers
  const createMutation = useMutation({
    mutationFn: adminCreateCoupon,
    onSuccess: () => router.push('/coupons'),
    onError: (err) => handleApiError(err),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => adminUpdateCoupon(couponId!, payload),
    onSuccess: () => router.push('/coupons'),
    onError: (err) => handleApiError(err),
  });

  const handleApiError = (err: any) => {
    const apiErr = extractApiError(err);
    if (apiErr.errors) {
      const details = Object.entries(apiErr.errors)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        .join('; ');
      setError(`Validation failed — ${details}`);
    } else {
      setError(apiErr.message);
    }
  };

  const isPending = mode === 'create' ? createMutation.isPending : updateMutation.isPending;

  if (mode === 'edit' && isLoadingCoupon) {
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
          <h1 className="text-2xl font-black text-white">
            {mode === 'create' ? 'Create Coupon' : 'Edit Coupon'}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {mode === 'create'
              ? 'Configure a new discount coupon code'
              : `Modify parameters for coupon ${coupon?.code}`}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <CouponForm
        initialData={mode === 'edit' ? coupon : undefined}
        onSubmit={(state) => {
          setError('');
          if (mode === 'create') {
            createMutation.mutate(buildCreateCouponPayload(state));
          } else {
            updateMutation.mutate(buildUpdateCouponPayload(state));
          }
        }}
        isPending={isPending}
        apiError={error}
        events={eventsData?.items ?? []}
        isLoadingEvents={isLoadingEvents}
      />
    </div>
  );
}
