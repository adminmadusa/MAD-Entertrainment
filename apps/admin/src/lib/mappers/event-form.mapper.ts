import { BookingMode, TicketTier } from '@mad/shared';
import type { EventMutationInput } from '@mad/contracts';

import { AdminEvent, CloudinaryImage } from '@/lib/api/admin/event.service';
import { toIsoDateTime, toLocalDateTimeInput } from '../forms/scheduling';
import { EventFormValues, EventMutationPayload, TicketTierFormValues } from '@/types/event-form';

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

export function getDefaultEventFormValues(): EventFormValues {
  return {
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
}

export function mapEventToFormValues(event: AdminEvent): EventFormValues {
  const defaults = getDefaultEventFormValues();
  const overrides = (event.ticketOverrides || []).reduce<Record<string, { totalCapacity?: number; isActive?: boolean }>>((acc, item) => {
    acc[item.tier] = { totalCapacity: item.totalCapacity, isActive: item.isActive };
    return acc;
  }, {});

  return {
    ...defaults,
    title: event.title || '',
    description: event.description || '',
    category: event.category || 'concert',
    status: event.status || 'draft',
    startDate: toLocalDateTimeInput(event.startDate),
    endDate: toLocalDateTimeInput(event.endDate),
    tags: (event.tags || []).join(', '),
    isFeatured: !!event.isFeatured,
    isAgeRestricted: !!event.isAgeRestricted,
    minimumAge: event.minimumAge || 18,
    coverImage: event.coverImage?.url && event.coverImage?.publicId ? {
      url: event.coverImage.url,
      publicId: event.coverImage.publicId,
      alt: event.coverImage.alt,
    } : null,
    venueName: event.venue || '',
    organizerName: (event as AdminEvent & { organizerName?: string }).organizerName || '',
    refundPolicy: (event as AdminEvent & { refundPolicy?: string }).refundPolicy || '',
    highlightsInput: ((event as AdminEvent & { highlights?: string[] }).highlights || []).join(', '),
    ticketingType: event.ticketProfileId ? 'profile' : 'custom',
    selectedProfileId: event.ticketProfileId || '',
    overrides,
    tiers: event.ticketTiers?.length
      ? event.ticketTiers.map((t) => ({
          name: t.name,
          price: t.price,
          capacity: t.totalCapacity || 100,
          groupSize: t.groupSize || 1,
          minPerBooking: t.minPerBooking || 1,
          discount: t.discount || 0,
          taxPercent: t.taxPercent || 0,
          startDate: '',
          endDate: '',
          description: t.description || '',
          isAvailable: t.isActive !== false,
        }))
      : [defaultTier()],
  };
}

export function mapFormValuesToPayload(values: EventFormValues): EventMutationPayload {
  const generatedSlug = values.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, '');
  const payload: EventMutationPayload = {
    title: values.title.trim(),
    slug: generatedSlug,
    description: values.description.trim(),
    category: values.category,
    status: values.status as EventMutationInput['status'],
    bookingMode: BookingMode.GENERAL_ADMISSION,
    bannerImage: values.coverImage as CloudinaryImage,
    coverImage: values.coverImage as CloudinaryImage,
    showTime: '00:00',
    venue: values.venueName.trim(),
    startDate: toIsoDateTime(values.startDate) || '',
    endDate: toIsoDateTime(values.endDate),
    isFeatured: values.isFeatured,
    isAgeRestricted: values.isAgeRestricted,
    minimumAge: values.isAgeRestricted ? values.minimumAge : undefined,
    tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
    highlights: values.highlightsInput.split(',').map((h) => h.trim()).filter(Boolean),
    refundPolicy: values.refundPolicy.trim() || undefined,
    organizerName: values.organizerName.trim() || undefined,
  };

  if (values.ticketingType === 'profile') {
    payload.ticketProfileId = values.selectedProfileId;
    payload.ticketOverrides = Object.entries(values.overrides)
      .map(([tier, vals]) => ({
        tier,
        totalCapacity: vals.totalCapacity !== undefined ? vals.totalCapacity : undefined,
        isActive: vals.isActive !== undefined ? vals.isActive : undefined,
      }))
      .filter((item) => item.totalCapacity !== undefined || item.isActive !== undefined);
    payload.ticketTiers = [];
    return payload;
  }

  const ticketTiers = values.tiers.map((tier) => {
    const resolvedTierEnum = Object.values(TicketTier).includes(tier.name as TicketTier)
      ? (tier.name as TicketTier)
      : TicketTier.CUSTOM;
    const capacity = Number(tier.capacity || 0);
    return {
      name: tier.name,
      price: Number(tier.price || 0),
      capacity,
      groupSize: 1,
      minPerBooking: 1,
      discount: 0,
      taxPercent: 0,
      isAvailable: true,
      tier: resolvedTierEnum,
      slug: tier.name,
      totalCapacity: capacity,
    };
  });

  payload.ticketProfileId = null;
  payload.ticketOverrides = [];
  payload.ticketTiers = ticketTiers;
  payload.totalCapacity = ticketTiers.reduce((sum, t) => sum + t.totalCapacity, 0);
  return payload;
}
