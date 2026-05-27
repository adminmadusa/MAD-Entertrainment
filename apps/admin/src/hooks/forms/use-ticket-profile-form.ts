'use client';

import { useState } from 'react';
import { TicketProfile } from '@mad/types';

import { appendAt, getFirstValidationError, removeAt, runFormSubmit, updateAt } from '@/lib/forms/core';
import {
  defaultGroup,
  defaultTicket,
  getDefaultTicketProfileFormValues,
  mapTicketProfileFormToPayload,
  mapTicketProfileToFormValues,
} from '@/lib/mappers/ticket-profile-form.mapper';
import { ticketProfileFormSchema } from '@/lib/validators/ticket-profile-form.schema';
import { TicketProfileFormMode, TicketProfileFormValues, TicketProfileTicketFormValues } from '@/types/ticket-profile-form';

interface UseTicketProfileFormOptions {
  mode: TicketProfileFormMode;
  initialProfile?: TicketProfile;
  onSubmitPayload: (payload: ReturnType<typeof mapTicketProfileFormToPayload>) => Promise<void> | void;
}

export function useTicketProfileForm({ mode, initialProfile, onSubmitPayload }: UseTicketProfileFormOptions) {
  const [values, setValues] = useState<TicketProfileFormValues>(
    mode === 'edit' && initialProfile ? mapTicketProfileToFormValues(initialProfile) : getDefaultTicketProfileFormValues()
  );
  const [error, setError] = useState('');

  const setField = <K extends keyof TicketProfileFormValues>(field: K, value: TicketProfileFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const addGroup = () => setValues((prev) => ({ ...prev, groups: appendAt(prev.groups, defaultGroup()) }));
  const removeGroup = (groupIndex: number) => setValues((prev) => ({ ...prev, groups: removeAt(prev.groups, groupIndex) }));

  const updateGroupField = (groupIndex: number, field: 'name' | 'slug' | 'description', value: string) => {
    setValues((prev) => ({
      ...prev,
      groups: updateAt(prev.groups, groupIndex, (group) => {
        if (field === 'name') {
          const generatedSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return { ...group, name: value, slug: generatedSlug };
        }
        return { ...group, [field]: value };
      }),
    }));
  };

  const addTicket = (groupIndex: number) => {
    setValues((prev) => ({
      ...prev,
      groups: updateAt(prev.groups, groupIndex, (group) => ({ ...group, tickets: appendAt(group.tickets, defaultTicket()) })),
    }));
  };

  const removeTicket = (groupIndex: number, ticketIndex: number) => {
    setValues((prev) => ({
      ...prev,
      groups: updateAt(prev.groups, groupIndex, (group) => ({ ...group, tickets: removeAt(group.tickets, ticketIndex) })),
    }));
  };

  const updateTicketField = (groupIndex: number, ticketIndex: number, field: keyof TicketProfileTicketFormValues, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      groups: updateAt(prev.groups, groupIndex, (group) => ({
        ...group,
        tickets: updateAt(group.tickets, ticketIndex, (ticket) => {
          if (field === 'price' && value === 0) return { ...ticket, price: 0, isFree: true };
          return { ...ticket, [field]: value };
        }),
      })),
    }));
  };

  const submit = async () => {
    await runFormSubmit(async () => {
      const result = ticketProfileFormSchema.safeParse(values);
      if (!result.success) {
        setError(getFirstValidationError(result));
        return;
      }
      await onSubmitPayload(mapTicketProfileFormToPayload(values));
    }, setError);
  };

  return {
    values,
    error,
    setField,
    setError,
    addGroup,
    removeGroup,
    updateGroupField,
    addTicket,
    removeTicket,
    updateTicketField,
    submit,
  };
}
