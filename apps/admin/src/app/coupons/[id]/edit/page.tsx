'use client';

import { useParams } from 'next/navigation';

import { CouponFormContainer } from '@/components/coupons/CouponFormContainer';

export default function EditCouponPage() {
  const params = useParams();
  const id = params.id as string;

  return <CouponFormContainer mode="edit" couponId={id} />;
}
