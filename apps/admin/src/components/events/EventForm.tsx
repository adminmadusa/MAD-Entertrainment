'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

import { EventAdditionalDetailsCard } from './EventAdditionalDetailsCard';
import { EventBasicInfoCard } from './EventBasicInfoCard';
import { EventMediaCard } from './EventMediaCard';
import { EventRequirementsCard } from './EventRequirementsCard';
import { EventScheduleCard } from './EventScheduleCard';
import { EventTicketingCard, defaultTier, type TicketTierInput } from './EventTicketingCard';
import { adminGetCategories } from '@/lib/api/admin/category.service';
import { type CloudinaryImage, type AdminEvent } from '@/lib/api/admin/event.service';
import { adminGetTicketProfiles } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import {
  BookingMode,
  TicketTier,
  EventStatus,
  EVENT_STATUS_TRANSITIONS,
  deriveEventLifecycleState,
  type EventLifecycleStatus,
} from '@mad/shared';
import type { TicketProfile } from '@mad/types';
import { EventReviewSection } from '@/app/events/new/_components/EventReviewSection';

export interface EventFormProps {
  initialValues?: Partial<AdminEvent>;
  activeStep?: number;
  onEditStep?: (step: number) => void;
  error?: string;
}

export interface EventFormHandle {
  validateStep: (step: number) => boolean;
  validateAll: () => boolean;
  getPayload: () => Partial<AdminEvent>;
}

export const EventForm = forwardRef<EventFormHandle, EventFormProps>(function EventForm(
  { initialValues, activeStep, onEditStep, error: propError },
  ref
) {
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
  const { data: dbCategories = [] } = useQuery({ queryKey: ['adminCategories'], queryFn: adminGetCategories });
  const { data: dbTiers = [] } = useQuery({ queryKey: ['adminTiers'], queryFn: adminGetTiers });
  const { data: dbProfiles = [] } = useQuery({ queryKey: ['adminTicketProfiles'], queryFn: adminGetTicketProfiles });

  const activeProfile = dbProfiles.find((p: TicketProfile) => p._id === selectedProfileId);

  const displayError = propError || localError;

  // Initialize values when initialValues prop is loaded
  useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title || '');
      setDescription(initialValues.description || '');
      setCategory(initialValues.category || 'concert');
      setStatus(initialValues.status || EventStatus.PUBLISHED);
      setStartDate(initialValues.startDate ? new Date(initialValues.startDate).toISOString().slice(0, 16) : '');
      setEndDate(initialValues.endDate ? new Date(initialValues.endDate).toISOString().slice(0, 16) : '');
      setBookingStartDate(initialValues.bookingStartDate ? new Date(initialValues.bookingStartDate).toISOString().slice(0, 16) : '');
      setBookingEndDate(initialValues.bookingEndDate ? new Date(initialValues.bookingEndDate).toISOString().slice(0, 16) : '');
      setVenue(initialValues.venue || '');
      setOrganizerName(initialValues.organizerName || '');
      setRefundPolicy(initialValues.refundPolicy || '');
      setHighlightsInput(initialValues.highlights?.join(', ') || '');
      setCountryCode(initialValues.countryCode || 'US');
      setConvenienceFee(initialValues.convenienceFee !== undefined ? initialValues.convenienceFee : '');
      setTags(initialValues.tags?.join(', ') || '');
      setRequireTerms(initialValues.requireTerms ?? true);
      setRequireAgeConfirmation(!!initialValues.requireAgeConfirmation);
      setAgeRestriction(initialValues.ageRestriction ?? 18);
      setBannerImage(initialValues.bannerImage || null);
      setPosterImage(initialValues.posterImage || null);
      setGalleryImages(initialValues.galleryImages || []);

      if (initialValues.ticketProfileId) {
        setTicketingType('profile');
        setSelectedProfileId(initialValues.ticketProfileId);
        const ovs: Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }> = {};
        initialValues.ticketOverrides?.forEach((ov) => {
          ovs[ov.tier] = { price: ov.price, totalCapacity: ov.totalCapacity, isActive: ov.isActive };
        });
        setOverrides(ovs);
      } else {
        setTicketingType('custom');
        setTiers(initialValues.ticketTiers && initialValues.ticketTiers.length > 0
          ? initialValues.ticketTiers.map((t) => ({ name: t.name, price: t.price, capacity: t.totalCapacity || t.quantity || 100 }))
          : [defaultTier()]);
      }
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
    setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  // Validations
  const validateStep = (step: number): boolean => {
    setLocalError('');
    if (step === 0) {
      if (!title.trim() || !description.trim()) {
        setLocalError('Title and description are required.');
        return false;
      }
      if (!venue.trim()) {
        setLocalError('Venue name is required.');
        return false;
      }
    } else if (step === 1) {
      if (!startDate) {
        setLocalError('Start date is required.');
        return false;
      }
    } else if (step === 2) {
      if (ticketingType === 'profile' && !selectedProfileId) {
        setLocalError('Please select a ticket profile.');
        return false;
      }
    } else if (step === 3) {
      if (!bannerImage) {
        setLocalError('Cover image is required.');
        return false;
      }
    }
    return true;
  };

  const validateAll = (): boolean => {
    setLocalError('');
    if (!title.trim() || !description.trim()) {
      setLocalError('Title and description are required.');
      return false;
    }
    if (!venue.trim()) {
      setLocalError('Venue name is required.');
      return false;
    }
    if (!startDate) {
      setLocalError('Start date is required.');
      return false;
    }
    if (ticketingType === 'profile' && !selectedProfileId) {
      setLocalError('Please select a ticket profile.');
      return false;
    }
    if (!bannerImage) {
      setLocalError('Cover image is required.');
      return false;
    }
    return true;
  };

  // Payload Construction
  const getPayload = (): Partial<AdminEvent> => {
    const generatedSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, '');
    const isProfileType = ticketingType === 'profile';

    const payload: Partial<AdminEvent> = {
      title: title.trim(),
      slug: generatedSlug,
      description: description.trim(),
      category,
      status,
      bookingMode: BookingMode.GENERAL_ADMISSION,
      bannerImage: bannerImage!,
      posterImage: posterImage ?? undefined,
      galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
      venue: venue.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      requireTerms,
      requireAgeConfirmation,
      ageRestriction: requireAgeConfirmation && ageRestriction ? Number(ageRestriction) : undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      highlights: Array.from(new Set(highlightsInput.split(',').map((h) => h.trim()).filter(Boolean))),
      bookingStartDate: bookingStartDate ? new Date(bookingStartDate).toISOString() : undefined,
      bookingEndDate: bookingEndDate ? new Date(bookingEndDate).toISOString() : undefined,
      refundPolicy: refundPolicy.trim() || undefined,
      organizerName: organizerName.trim() || undefined,
      countryCode,
      currency: countryCode === 'IN' ? 'INR' : 'USD',
      taxLabel: countryCode === 'IN' ? 'GST' : 'Sales Tax',
      taxPercentage: countryCode === 'IN' ? 18 : 0,
      locale: countryCode === 'IN' ? 'en-IN' : 'en-US',
      convenienceFee: convenienceFee === '' ? undefined : convenienceFee,
    };

    if (isProfileType) {
      payload.ticketProfileId = selectedProfileId;
      payload.ticketOverrides = Object.entries(overrides)
        .map(([tier, vals]) => ({
          tier,
          totalCapacity: vals.totalCapacity,
          isActive: vals.isActive,
        }))
        .filter((o) => o.totalCapacity !== undefined || o.isActive !== undefined);

      payload.totalCapacity = 1;
    } else {
      const ticketTiers = tiers.map((t) => ({
        name: t.name,
        price: Number(t.price),
        capacity: Number(t.capacity),
        groupSize: 1,
        minPerBooking: 1,
        discount: 0,
        taxPercent: 0,
        isAvailable: true,
      }));

      payload.ticketTiers = ticketTiers.map(t => {
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
  };

  // Expose Imperative Ref Handles
  useImperativeHandle(ref, () => ({
    validateStep,
    validateAll,
    getPayload,
  }));

  // Render Layout
  const isCreateWizard = activeStep !== undefined;

  const isEventLifecycleStatus = (s: EventStatus): s is EventLifecycleStatus =>
    Object.prototype.hasOwnProperty.call(EVENT_STATUS_TRANSITIONS, s);

  const allowedNextStatuses = isEventLifecycleStatus(status) ? EVENT_STATUS_TRANSITIONS[status] : [];
  const statusOptions = Array.from(new Set<EventStatus>([status, ...allowedNextStatuses]));
  const lifecycle = deriveEventLifecycleState({ status, startDate, endDate } as any);

  return (
    <div className="space-y-6">
      {displayError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          aria-live="polite"
          className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
        >
          {displayError}
        </motion.div>
      )}

      {isCreateWizard ? (
        <>
          {/* STEP 1: Basic Information */}
          {activeStep === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <EventBasicInfoCard
                title={title}
                setTitle={setTitle}
                category={category}
                setCategory={setCategory}
                venue={venue}
                setVenue={setVenue}
                description={description}
                setDescription={setDescription}
                dbCategories={dbCategories}
                hideStatus
                countryCode={countryCode}
                setCountryCode={setCountryCode}
                convenienceFee={convenienceFee}
                setConvenienceFee={setConvenienceFee}
              />
              <EventAdditionalDetailsCard
                organizerName={organizerName}
                setOrganizerName={setOrganizerName}
                highlightsInput={highlightsInput}
                setHighlightsInput={setHighlightsInput}
                refundPolicy={refundPolicy}
                setRefundPolicy={setRefundPolicy}
              />
            </motion.div>
          )}

          {/* STEP 2: Schedule */}
          {activeStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <EventScheduleCard
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                bookingStartDate={bookingStartDate}
                setBookingStartDate={setBookingStartDate}
                bookingEndDate={bookingEndDate}
                setBookingEndDate={setBookingEndDate}
              />
            </motion.div>
          )}

          {/* STEP 3: Ticket Configuration & Requirements */}
          {activeStep === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <EventTicketingCard
                ticketingType={ticketingType}
                setTicketingType={setTicketingType}
                tiers={tiers}
                onAddTier={addTier}
                onRemoveTier={removeTier}
                onUpdateTier={updateTier}
                selectedProfileId={selectedProfileId}
                setSelectedProfileId={setSelectedProfileId}
                overrides={overrides}
                onOverrideChange={handleOverrideChange}
                dbTiers={dbTiers}
                dbProfiles={dbProfiles}
                activeProfile={activeProfile}
                eventTitle={title}
              />
              <EventRequirementsCard
                tags={tags}
                setTags={setTags}
                requireTerms={requireTerms}
                setRequireTerms={setRequireTerms}
                requireAgeConfirmation={requireAgeConfirmation}
                setRequireAgeConfirmation={setRequireAgeConfirmation}
                ageRestriction={ageRestriction}
                setAgeRestriction={setAgeRestriction}
              />
            </motion.div>
          )}

          {/* STEP 4: Media Uploads */}
          {activeStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <EventMediaCard
                bannerImage={bannerImage}
                setBannerImage={setBannerImage}
                posterImage={posterImage}
                setPosterImage={setPosterImage}
                galleryImages={galleryImages}
                setGalleryImages={setGalleryImages}
              />
            </motion.div>
          )}

          {/* STEP 5: Review & Publish */}
          {activeStep === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <EventReviewSection
                title={title}
                category={category}
                description={description}
                venueName={venue}
                status={status}
                startDate={startDate}
                endDate={endDate}
                bookingStartDate={bookingStartDate}
                bookingEndDate={bookingEndDate}
                requireTerms={requireTerms}
                requireAgeConfirmation={requireAgeConfirmation}
                ageRestriction={ageRestriction}
                tags={tags}
                ticketingType={ticketingType}
                tiers={tiers}
                selectedProfileId={selectedProfileId}
                coverImage={bannerImage}
                posterImage={posterImage}
                galleryImages={galleryImages}
                onEditStep={onEditStep}
              />
            </motion.div>
          )}
        </>
      ) : (
        /* Edit view: render all cards stacked */
        <>
          <EventMediaCard
            bannerImage={bannerImage}
            setBannerImage={setBannerImage}
            posterImage={posterImage}
            setPosterImage={setPosterImage}
            galleryImages={galleryImages}
            setGalleryImages={setGalleryImages}
          />

          <EventBasicInfoCard
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            status={status}
            setStatus={setStatus}
            lifecycle={lifecycle}
            venue={venue}
            setVenue={setVenue}
            description={description}
            setDescription={setDescription}
            dbCategories={dbCategories}
            statusOptions={statusOptions}
            countryCode={countryCode}
            setCountryCode={setCountryCode}
            convenienceFee={convenienceFee}
            setConvenienceFee={setConvenienceFee}
          />

          <EventAdditionalDetailsCard
            organizerName={organizerName}
            setOrganizerName={setOrganizerName}
            highlightsInput={highlightsInput}
            setHighlightsInput={setHighlightsInput}
            refundPolicy={refundPolicy}
            setRefundPolicy={setRefundPolicy}
          />

          <EventScheduleCard
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            bookingStartDate={bookingStartDate}
            setBookingStartDate={setBookingStartDate}
            bookingEndDate={bookingEndDate}
            setBookingEndDate={setBookingEndDate}
          />

          <EventTicketingCard
            ticketingType={ticketingType}
            setTicketingType={setTicketingType}
            tiers={tiers}
            onAddTier={addTier}
            onRemoveTier={removeTier}
            onUpdateTier={updateTier}
            selectedProfileId={selectedProfileId}
            setSelectedProfileId={setSelectedProfileId}
            overrides={overrides}
            onOverrideChange={handleOverrideChange}
            dbTiers={dbTiers}
            dbProfiles={dbProfiles}
            activeProfile={activeProfile}
            eventTitle={title}
          />

          <EventRequirementsCard
            requireTerms={requireTerms}
            setRequireTerms={setRequireTerms}
            requireAgeConfirmation={requireAgeConfirmation}
            setRequireAgeConfirmation={setRequireAgeConfirmation}
            ageRestriction={ageRestriction}
            setAgeRestriction={setAgeRestriction}
            tags={tags}
            setTags={setTags}
          />
        </>
      )}
    </div>
  );
});
