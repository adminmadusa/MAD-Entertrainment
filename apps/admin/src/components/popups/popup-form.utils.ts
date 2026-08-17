import type { ImageAsset, PopupCampaign } from '@mad/types';

export const POPUP_PAGE_OPTIONS = [
  { value: '/',       label: 'Home Page' },
  { value: '/events', label: 'Events Listing' },
];

export interface PopupFormState {
  name: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  trigger: string;
  triggerDelay: number;
  cooldownHours: number;
  priority: number;
  isActive: boolean;
  showOnPages: string[];
  linkedEventId: string;
  startDate: string;
  endDate: string;
  image: ImageAsset | null;
}

export const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

export function defaultPopupForm(): PopupFormState {
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
    showOnPages: [],
    linkedEventId: '',
    startDate: '',
    endDate: '',
    image: null,
  };
}

export function mapPopupToFormState(popup: PopupCampaign | null | undefined): PopupFormState {
  if (!popup) return defaultPopupForm();
  return {
    name: popup.name || '',
    title: popup.title || '',
    description: popup.description || '',
    ctaText: popup.ctaText || '',
    ctaUrl: popup.ctaUrl || '',
    trigger: popup.trigger || 'on_load',
    triggerDelay: popup.triggerDelay ?? 3000,
    cooldownHours: popup.cooldownHours ?? 24,
    priority: popup.priority ?? 0,
    isActive: popup.isActive ?? true,
    showOnPages: popup.showOnPages || [],
    linkedEventId: popup.linkedEventId ? String(popup.linkedEventId) : '',
    startDate: popup.startDate ? new Date(popup.startDate).toISOString().slice(0, 16) : '',
    endDate: popup.endDate ? new Date(popup.endDate).toISOString().slice(0, 16) : '',
    image: popup.image || null,
  };
}

export function buildPopupPayload(state: PopupFormState): Partial<PopupCampaign> {
  return {
    name: state.name.trim(),
    title: state.title.trim(),
    description: state.description.trim() || undefined,
    ctaText: state.ctaText.trim() || undefined,
    ctaUrl: state.ctaUrl.trim() || undefined,
    trigger: state.trigger,
    triggerDelay: Number(state.triggerDelay),
    cooldownHours: Number(state.cooldownHours),
    priority: Number(state.priority),
    isActive: state.isActive,
    showOnPages: state.showOnPages,
    linkedEventId: state.linkedEventId.trim() || undefined,
    startDate: state.startDate ? new Date(state.startDate).toISOString() : undefined,
    endDate: state.endDate ? new Date(state.endDate).toISOString() : undefined,
    image: state.image ?? undefined,
  };
}
