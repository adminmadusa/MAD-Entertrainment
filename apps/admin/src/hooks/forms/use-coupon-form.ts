'use client';

import { EventCategory } from '@mad/shared';
import { Coupon } from '@mad/types';
import { useState } from 'react';

import { getFirstValidationError, runFormSubmit } from '@/lib/forms/core';
import {
  getDefaultCouponFormValues,
  mapCouponFormToPayload,
  mapCouponToFormValues,
} from '@/lib/mappers/coupon-form.mapper';
import { couponFormSchema } from '@/lib/validators/coupon-form.schema';
import { CouponFormMode, CouponFormValues } from '@/types/coupon-form';

interface UseCouponFormOptions {
  mode: CouponFormMode;
  initialCoupon?: Coupon;
  onSubmitPayload: (payload: ReturnType<typeof mapCouponFormToPayload>) => Promise<void> | void;
}

export function useCouponForm({ mode, initialCoupon, onSubmitPayload }: UseCouponFormOptions) {
  const [values, setValues] = useState<CouponFormValues>(
    mode === 'edit' && initialCoupon ? mapCouponToFormValues(initialCoupon) : getDefaultCouponFormValues()
  );
  const [error, setError] = useState('');

  const setField = <K extends keyof CouponFormValues>(field: K, value: CouponFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEventSelection = (eventId: string) => {
    setValues((prev) => ({
      ...prev,
      applicableEventIds: prev.applicableEventIds.includes(eventId)
        ? prev.applicableEventIds.filter((id) => id !== eventId)
        : [...prev.applicableEventIds, eventId],
    }));
  };

  const toggleCategorySelection = (category: EventCategory) => {
    setValues((prev) => ({
      ...prev,
      applicableCategories: prev.applicableCategories.includes(category)
        ? prev.applicableCategories.filter((cat) => cat !== category)
        : [...prev.applicableCategories, category],
    }));
  };

  const submit = async () => {
    await runFormSubmit(async () => {
      const result = couponFormSchema.safeParse(values);
      if (!result.success) {
        setError(getFirstValidationError(result));
        return;
      }
      await onSubmitPayload(mapCouponFormToPayload(values));
    }, setError);
  };

  return {
    values,
    error,
    setError,
    setField,
    toggleEventSelection,
    toggleCategorySelection,
    submit,
  };
}
