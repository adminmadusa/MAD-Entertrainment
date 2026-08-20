'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGetCategories } from '@/lib/api/admin/category.service';
import { adminGetTicketProfiles } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { type CloudinaryImage, type AdminEvent } from '@/lib/api/admin/event.service';
import {
  EventStatus,
  EVENT_STATUS_TRANSITIONS,
  deriveEventLifecycleState,
  type EventLifecycleStatus,
} from '@mad/shared';
import type { TicketProfile } from '@mad/types';

import { defaultTier, type TicketTierInput } from './EventTicketingCard';
import {
  validateEventFormStep,
  validateEventFormAll,
  buildEventFormPayload,
  normalizeInitialEventForm,
} from './event-form.utils';

export function useEventFormState(initialValues?: Partial<AdminEvent>, propError?: string) {
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('concert');
  const [status, setStatus] = useState<EventStatus>(EventStatus.PUBLISHED);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingStartDate, setBookingStartDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [requireTerms, setRequireTerms] = useState(true);
  const [requireAgeConfirmation, setRequireAgeConfirmation] = useState(false);
  const [ageRestriction, setAgeRestriction] = useState<number | ''>(18);
  const [bannerImage, setBannerImage] = useState<CloudinaryImage | null>(null);
  const [posterImage, setPosterImage] = useState<CloudinaryImage | null>(null);
  const [galleryImages, setGalleryImages] = useState<CloudinaryImage[]>([]);
  const [tiers, setTiers] = useState<TicketTierInput[]>([defaultTier()]);
  const [ticketingType, setTicketingType] = useState<'custom' | 'profile'>('custom');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [overrides, setOverrides] = useState<
    Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>
  >({});
  const [venue, setVenue] = useState<string>('');
  const [organizerName, setOrganizerName] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [convenienceFee, setConvenienceFee] = useState<number | ''>('');
  const [localError, setLocalError] = useState('');

  // Queries
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: adminGetCategories,
  });
  const { data: dbTiers = [] } = useQuery({ queryKey: ['adminTiers'], queryFn: adminGetTiers });
  const { data: dbProfiles = [] } = useQuery({
    queryKey: ['adminTicketProfiles'],
    queryFn: adminGetTicketProfiles,
  });

  const activeProfile = dbProfiles.find((p: TicketProfile) => p._id === selectedProfileId);
  const displayError = propError || localError;

  // Initialize values when initialValues prop is loaded
  useEffect(() => {
    if (initialValues) {
      const init = normalizeInitialEventForm(initialValues);
      setTitle(init.title);
      setDescription(init.description);
      setCategory(init.category);
      setStatus(init.status);
      setStartDate(init.startDate);
      setEndDate(init.endDate);
      setBookingStartDate(init.bookingStartDate);
      setBookingEndDate(init.bookingEndDate);
      setVenue(init.venue);
      setOrganizerName(init.organizerName);
      setRefundPolicy(init.refundPolicy);
      setHighlightsInput(init.highlightsInput);
      setCountryCode(init.countryCode);
      setConvenienceFee(init.convenienceFee);
      setTags(init.tags);
      setRequireTerms(init.requireTerms);
      setRequireAgeConfirmation(init.requireAgeConfirmation);
      setAgeRestriction(init.ageRestriction);
      setBannerImage(init.bannerImage);
      setPosterImage(init.posterImage);
      setGalleryImages(init.galleryImages);
      setTicketingType(init.ticketingType);
      setSelectedProfileId(init.selectedProfileId);
      setOverrides(init.overrides);
      setTiers(init.tiers);
    }
  }, [initialValues]);

  const handleOverrideChange = (
    tier: string,
    field: 'price' | 'totalCapacity' | 'isActive',
    value: number | boolean | undefined
  ) => {
    setOverrides((prev) => ({
      ...prev,
      [tier]: { ...(prev[tier] || {}), [field]: value },
    }));
  };

  const addTier = () => setTiers((prev) => [...prev, defaultTier()]);
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof TicketTierInput, value: unknown) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));

  const validationState = {
    title,
    description,
    venue,
    startDate,
    ticketingType,
    selectedProfileId,
    bannerImage,
  };

  const validateStep = (step: number): boolean => {
    const result = validateEventFormStep(step, validationState);
    setLocalError(result.error || '');
    return result.valid;
  };

  const validateAll = (): boolean => {
    const result = validateEventFormAll(validationState);
    setLocalError(result.error || '');
    return result.valid;
  };

  const getPayload = (): Partial<AdminEvent> =>
    buildEventFormPayload({
      title,
      description,
      category,
      status,
      bannerImage,
      posterImage,
      galleryImages,
      venue,
      startDate,
      endDate,
      bookingStartDate,
      bookingEndDate,
      requireTerms,
      requireAgeConfirmation,
      ageRestriction,
      tags,
      highlightsInput,
      refundPolicy,
      organizerName,
      countryCode,
      convenienceFee,
      ticketingType,
      selectedProfileId,
      overrides,
      tiers,
    });

  const isEventLifecycleStatus = (s: EventStatus): s is EventLifecycleStatus =>
    Object.prototype.hasOwnProperty.call(EVENT_STATUS_TRANSITIONS, s);

  const allowedNextStatuses = isEventLifecycleStatus(status)
    ? EVENT_STATUS_TRANSITIONS[status]
    : [];
  const statusOptions = Array.from(new Set<EventStatus>([status, ...allowedNextStatuses]));
  const lifecycle = deriveEventLifecycleState({ status, startDate, endDate } as any);

  return {
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    status,
    setStatus,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    bookingStartDate,
    setBookingStartDate,
    bookingEndDate,
    setBookingEndDate,
    tags,
    setTags,
    requireTerms,
    setRequireTerms,
    requireAgeConfirmation,
    setRequireAgeConfirmation,
    ageRestriction,
    setAgeRestriction,
    bannerImage,
    setBannerImage,
    posterImage,
    setPosterImage,
    galleryImages,
    setGalleryImages,
    tiers,
    addTier,
    removeTier,
    updateTier,
    ticketingType,
    setTicketingType,
    selectedProfileId,
    setSelectedProfileId,
    overrides,
    handleOverrideChange,
    venue,
    setVenue,
    organizerName,
    setOrganizerName,
    refundPolicy,
    setRefundPolicy,
    highlightsInput,
    setHighlightsInput,
    countryCode,
    setCountryCode,
    convenienceFee,
    setConvenienceFee,
    displayError,
    dbCategories,
    dbTiers,
    dbProfiles,
    activeProfile,
    statusOptions,
    lifecycle,
    validateStep,
    validateAll,
    getPayload,
  };
}
