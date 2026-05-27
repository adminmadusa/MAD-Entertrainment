'use client';

import { PopupCampaign } from '@mad/types';
import { useState } from 'react';

import { getFirstValidationError, runFormSubmit } from '@/lib/forms/core';
import { resolveVisibilityState } from '@/lib/forms/visibility';
import { getDefaultPopupFormValues, mapPopupFormToPayload, mapPopupToFormValues } from '@/lib/mappers/popup-form.mapper';
import { popupFormSchema } from '@/lib/validators/popup-form.schema';
import { PopupFormMode, PopupFormValues } from '@/types/popup-form';

interface UsePopupFormOptions {
  mode: PopupFormMode;
  initialPopup?: PopupCampaign;
  onSubmitPayload: (payload: ReturnType<typeof mapPopupFormToPayload>) => Promise<void> | void;
}

export function usePopupForm({ mode, initialPopup, onSubmitPayload }: UsePopupFormOptions) {
  const [values, setValues] = useState<PopupFormValues>(
    mode === 'edit' && initialPopup ? mapPopupToFormValues(initialPopup) : getDefaultPopupFormValues()
  );
  const [error, setError] = useState('');

  const setField = <K extends keyof PopupFormValues>(field: K, value: PopupFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    await runFormSubmit(async () => {
      const result = popupFormSchema.safeParse(values);
      if (!result.success) {
        setError(getFirstValidationError(result));
        return;
      }
      await onSubmitPayload(mapPopupFormToPayload(values));
    }, setError);
  };

  const visibilityState = resolveVisibilityState(values.isActive, values.startDate || undefined, values.endDate || undefined);

  return { values, error, visibilityState, setField, setError, submit };
}
