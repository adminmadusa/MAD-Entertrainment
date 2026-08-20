import { BookingMode, TicketTier, EventStatus } from '@mad/shared';
import type { AdminEvent, CloudinaryImage } from '@/lib/api/admin/event.service';
import { defaultTier, type TicketTierInput } from './EventTicketingCard';

export interface EventFormValidationState {
  title: string;
  description: string;
  venue: string;
  startDate: string;
  ticketingType: 'custom' | 'profile';
  selectedProfileId: string;
  bannerImage: CloudinaryImage | null;
}

export function validateEventFormStep(
  step: number,
  state: EventFormValidationState
): { valid: boolean; error?: string } {
  if (step === 0) {
    if (!state.title.trim() || !state.description.trim()) {
      return { valid: false, error: 'Title and description are required.' };
    }
    if (!state.venue.trim()) {
      return { valid: false, error: 'Venue name is required.' };
    }
  } else if (step === 1) {
    if (!state.startDate) {
      return { valid: false, error: 'Start date is required.' };
    }
  } else if (step === 2) {
    if (state.ticketingType === 'profile' && !state.selectedProfileId) {
      return { valid: false, error: 'Please select a ticket profile.' };
    }
  } else if (step === 3) {
    if (!state.bannerImage) {
      return { valid: false, error: 'Cover image is required.' };
    }
  }
  return { valid: true };
}

export function validateEventFormAll(
  state: EventFormValidationState
): { valid: boolean; error?: string } {
  if (!state.title.trim() || !state.description.trim()) {
    return { valid: false, error: 'Title and description are required.' };
  }
  if (!state.venue.trim()) {
    return { valid: false, error: 'Venue name is required.' };
  }
  if (!state.startDate) {
    return { valid: false, error: 'Start date is required.' };
  }
  if (state.ticketingType === 'profile' && !state.selectedProfileId) {
    return { valid: false, error: 'Please select a ticket profile.' };
  }
  if (!state.bannerImage) {
    return { valid: false, error: 'Cover image is required.' };
  }
  return { valid: true };
}

export function normalizeInitialEventForm(initialValues: Partial<AdminEvent>) {
  const formatIsoDate = (d?: string | Date) => (d ? new Date(d).toISOString().slice(0, 16) : '');

  const ovs: Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }> = {};
  if (initialValues.ticketProfileId) {
    initialValues.ticketOverrides?.forEach((ov) => {
      ovs[ov.tier] = {
        price: ov.price,
        totalCapacity: ov.totalCapacity,
        isActive: ov.isActive,
      };
    });
  }

  const initialTiers =
    initialValues.ticketTiers && initialValues.ticketTiers.length > 0
      ? initialValues.ticketTiers.map((t) => ({
          name: t.name,
          price: t.price,
          capacity: t.totalCapacity || t.quantity || 100,
        }))
      : [defaultTier()];

  return {
    title: initialValues.title || '',
    description: initialValues.description || '',
    category: initialValues.category || 'concert',
    status: initialValues.status || EventStatus.PUBLISHED,
    startDate: formatIsoDate(initialValues.startDate),
    endDate: formatIsoDate(initialValues.endDate),
    bookingStartDate: formatIsoDate(initialValues.bookingStartDate),
    bookingEndDate: formatIsoDate(initialValues.bookingEndDate),
    venue: initialValues.venue || '',
    organizerName: initialValues.organizerName || '',
    refundPolicy: initialValues.refundPolicy || '',
    highlightsInput: initialValues.highlights?.join(', ') || '',
    countryCode: initialValues.countryCode || 'US',
    convenienceFee:
      initialValues.convenienceFee !== undefined ? initialValues.convenienceFee : (' ' as any),
    tags: initialValues.tags?.join(', ') || '',
    requireTerms: initialValues.requireTerms ?? true,
    requireAgeConfirmation: !!initialValues.requireAgeConfirmation,
    ageRestriction: initialValues.ageRestriction ?? 18,
    bannerImage: initialValues.bannerImage || null,
    posterImage: initialValues.posterImage || null,
    galleryImages: initialValues.galleryImages || [],
    ticketingType: initialValues.ticketProfileId ? ('profile' as const) : ('custom' as const),
    selectedProfileId: initialValues.ticketProfileId || '',
    overrides: ovs,
    tiers: initialTiers,
  };
}

export interface BuildEventPayloadParams {
  title: string;
  description: string;
  category: string;
  status: EventStatus;
  bannerImage: CloudinaryImage | null;
  posterImage: CloudinaryImage | null;
  galleryImages: CloudinaryImage[];
  venue: string;
  startDate: string;
  endDate: string;
  bookingStartDate: string;
  bookingEndDate: string;
  requireTerms: boolean;
  requireAgeConfirmation: boolean;
  ageRestriction: number | '';
  tags: string;
  highlightsInput: string;
  refundPolicy: string;
  organizerName: string;
  countryCode: string;
  convenienceFee: number | '';
  ticketingType: 'custom' | 'profile';
  selectedProfileId: string;
  overrides: Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>;
  tiers: TicketTierInput[];
}

export function buildEventFormPayload(params: BuildEventPayloadParams): Partial<AdminEvent> {
  const generatedSlug = params.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[-]+|[-]+$/g, '');
  const isProfileType = params.ticketingType === 'profile';

  const payload: Partial<AdminEvent> = {
    title: params.title.trim(),
    slug: generatedSlug,
    description: params.description.trim(),
    category: params.category,
    status: params.status,
    bookingMode: BookingMode.GENERAL_ADMISSION,
    bannerImage: params.bannerImage!,
    posterImage: params.posterImage ?? undefined,
    galleryImages: params.galleryImages.length > 0 ? params.galleryImages : undefined,
    venue: params.venue.trim(),
    startDate: new Date(params.startDate).toISOString(),
    endDate: params.endDate ? new Date(params.endDate).toISOString() : undefined,
    requireTerms: params.requireTerms,
    requireAgeConfirmation: params.requireAgeConfirmation,
    ageRestriction:
      params.requireAgeConfirmation && params.ageRestriction
        ? Number(params.ageRestriction)
        : undefined,
    tags: params.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    highlights: Array.from(
      new Set(
        params.highlightsInput
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean)
      )
    ),
    bookingStartDate: params.bookingStartDate
      ? new Date(params.bookingStartDate).toISOString()
      : undefined,
    bookingEndDate: params.bookingEndDate
      ? new Date(params.bookingEndDate).toISOString()
      : undefined,
    refundPolicy: params.refundPolicy.trim() || undefined,
    organizerName: params.organizerName.trim() || undefined,
    countryCode: params.countryCode,
    currency: params.countryCode === 'IN' ? 'INR' : 'USD',
    taxLabel: params.countryCode === 'IN' ? 'GST' : 'Sales Tax',
    taxPercentage: params.countryCode === 'IN' ? 18 : 0,
    locale: params.countryCode === 'IN' ? 'en-IN' : 'en-US',
    convenienceFee: params.convenienceFee === '' ? undefined : params.convenienceFee,
  };

  if (isProfileType) {
    payload.ticketProfileId = params.selectedProfileId;
    payload.ticketOverrides = Object.entries(params.overrides)
      .map(([tier, vals]) => ({
        tier,
        totalCapacity: vals.totalCapacity,
        isActive: vals.isActive,
      }))
      .filter((o) => o.totalCapacity !== undefined || o.isActive !== undefined);

    payload.totalCapacity = 1;
  } else {
    const ticketTiers = params.tiers.map((t) => ({
      name: t.name,
      price: Number(t.price),
      capacity: Number(t.capacity),
      groupSize: 1,
      minPerBooking: 1,
      discount: 0,
      taxPercent: 0,
      isAvailable: true,
    }));

    payload.ticketTiers = ticketTiers.map((t) => {
      const resolvedTierEnum = Object.values(TicketTier).includes(t.name as TicketTier)
        ? (t.name as TicketTier)
        : TicketTier.CUSTOM;
      return {
        ...t,
        tier: resolvedTierEnum,
        slug: t.name,
        totalCapacity: t.capacity,
      };
    });
    payload.totalCapacity = ticketTiers.reduce((sum, t) => sum + Number(t.capacity || 0), 0);
  }

  return payload;
}
