import { PopupCampaign } from '@mad/types';

import { toIsoDateTime, toLocalDateTimeInput } from '../forms/scheduling';
import { PopupFormValues, PopupMutationPayload } from '@/types/popup-form';

export function getDefaultPopupFormValues(): PopupFormValues {
  return {
    name: '',
    title: '',
    description: '',
    ctaText: '',
    ctaUrl: '',
    trigger: 'on_load',
    triggerDelay: 3000,
    cooldownHours: 24,
    priority: 0,
    isActive: true,
    showOnPages: '',
    linkedEventId: '',
    startDate: '',
    endDate: '',
    image: null,
  };
}

export function mapPopupToFormValues(popup: PopupCampaign): PopupFormValues {
  return {
    name: popup.name || '',
    title: popup.title || '',
    description: popup.description || '',
    ctaText: popup.ctaText || '',
    ctaUrl: popup.ctaUrl || '',
    trigger: (popup.trigger as PopupFormValues['trigger']) || 'on_load',
    triggerDelay: popup.triggerDelay ?? 3000,
    cooldownHours: popup.cooldownHours ?? 24,
    priority: popup.priority ?? 0,
    isActive: popup.isActive ?? true,
    showOnPages: popup.showOnPages?.join(', ') || '',
    linkedEventId: popup.linkedEventId ? String(popup.linkedEventId) : '',
    startDate: toLocalDateTimeInput(popup.startDate),
    endDate: toLocalDateTimeInput(popup.endDate),
    image: (popup.image as PopupFormValues['image']) || null,
  };
}

export function mapPopupFormToPayload(values: PopupFormValues): PopupMutationPayload {
  return {
    name: values.name.trim(),
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    ctaText: values.ctaText.trim() || undefined,
    ctaUrl: values.ctaUrl.trim() || undefined,
    trigger: values.trigger,
    triggerDelay: Number(values.triggerDelay || 0),
    cooldownHours: Number(values.cooldownHours || 1),
    priority: Number(values.priority || 0),
    isActive: values.isActive,
    showOnPages: values.showOnPages
      ? values.showOnPages
          .split(',')
          .map((page) => page.trim())
          .filter(Boolean)
      : undefined,
    linkedEventId: values.linkedEventId.trim() || undefined,
    startDate: toIsoDateTime(values.startDate),
    endDate: toIsoDateTime(values.endDate),
    image: values.image || undefined,
  };
}
