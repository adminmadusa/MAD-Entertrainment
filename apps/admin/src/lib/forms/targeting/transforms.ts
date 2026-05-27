import { EventCategory } from '@mad/shared';

import { normalizeCategoryArray, normalizePagesInput, normalizeStringArray } from './normalization';

export function toCouponTargetingPayload(eventIds: string[], categories: EventCategory[]) {
  const normalizedEventIds = normalizeStringArray(eventIds);
  const normalizedCategories = normalizeCategoryArray(categories);

  return {
    applicableEventIds: normalizedEventIds.length > 0 ? normalizedEventIds : [],
    applicableCategories: normalizedCategories.length > 0 ? normalizedCategories : [],
  };
}

export function toPopupTargetingPayload(showOnPages: string, linkedEventId: string) {
  const normalizedPages = normalizePagesInput(showOnPages);
  const normalizedLinkedEventId = linkedEventId.trim();

  return {
    showOnPages: normalizedPages.length > 0 ? normalizedPages : undefined,
    linkedEventId: normalizedLinkedEventId || undefined,
  };
}
