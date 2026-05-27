'use client';

import { useState } from 'react';

import { mapEventToFormValues, mapFormValuesToPayload } from '@/lib/mappers/event-form.mapper';
import { eventFormSchema } from '@/lib/validators/event-form.schema';
import { AdminEvent } from '@/lib/api/admin/event.service';
import { EventFormMode, EventFormValues, TicketTierFormValues } from '@/types/event-form';

interface UseEventFormOptions {
  mode: EventFormMode;
  initialEvent?: AdminEvent;
  onSubmitPayload: (payload: ReturnType<typeof mapFormValuesToPayload>) => Promise<void> | void;
}

const defaultTier = (): TicketTierFormValues => ({
  name: 'general',
  price: '',
  capacity: '',
  groupSize: '',
  minPerBooking: '',
  discount: '',
  taxPercent: '',
  startDate: '',
  endDate: '',
  description: '',
  isAvailable: true,
});

const defaultValues: EventFormValues = {
  title: '',
  description: '',
  category: 'concert',
  status: 'draft',
  startDate: '',
  endDate: '',
  tags: '',
  isFeatured: false,
  isAgeRestricted: false,
  minimumAge: 18,
  coverImage: null,
  venueName: '',
  organizerName: '',
  refundPolicy: '',
  highlightsInput: '',
  tiers: [defaultTier()],
  ticketingType: 'custom',
  selectedProfileId: '',
  overrides: {},
};

export function useEventForm({ mode, initialEvent, onSubmitPayload }: UseEventFormOptions) {
  const [values, setValues] = useState<EventFormValues>(
    mode === 'edit' && initialEvent ? mapEventToFormValues(initialEvent) : defaultValues
  );
  const [error, setError] = useState('');

  const activeProfileId = values.selectedProfileId;

  const setField = <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const addTier = () => setValues((prev) => ({ ...prev, tiers: [...prev.tiers, defaultTier()] }));
  const removeTier = (index: number) =>
    setValues((prev) => ({ ...prev, tiers: prev.tiers.filter((_, idx) => idx !== index) }));
  const updateTier = (index: number, field: keyof TicketTierFormValues, value: unknown) =>
    setValues((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier, idx) => (idx === index ? { ...tier, [field]: value } : tier)),
    }));

  const setOverride = (tier: string, field: 'totalCapacity' | 'isActive', value: number | boolean | undefined) =>
    setValues((prev) => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        [tier]: { ...(prev.overrides[tier] || {}), [field]: value },
      },
    }));

  const resetOverridesForProfile = (profileId: string) =>
    setValues((prev) => ({ ...prev, selectedProfileId: profileId, overrides: {} }));

  const submit = async () => {
    setError('');
    const parsed = eventFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please fix validation errors.');
      return;
    }
    if (!values.coverImage) {
      setError('Cover image is required.');
      return;
    }
    await onSubmitPayload(mapFormValuesToPayload(values));
  };

  return {
    values,
    error,
    setError,
    setField,
    addTier,
    removeTier,
    updateTier,
    setOverride,
    resetOverridesForProfile,
    submit,
    activeProfileId,
  };
}
