'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { EventRequirementsCard } from '@/components/events/EventRequirementsCard';
import { adminGetCategories } from '@/lib/api/admin/category.service';
import { adminCreateEvent, AdminEvent } from '@/lib/api/admin/event.service';
import { adminGetTicketProfiles } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';
import { BookingMode, TicketTier, EventStatus } from '@mad/shared';
import type { TicketProfile } from '@mad/types';
import { Button, Stepper } from '@mad/ui';

import { 
  EventBasicInfoSection, 
  EventScheduleSection, 
  EventVenueSection, 
  EventTicketSection, 
  EventMediaSection, 
  EventReviewSection,
  defaultTier, 
  TicketTierInput, 
  CloudinaryImage 
} from './_components';

const STEPS = [
  'Basic Information',
  'Schedule',
  'Ticket Configuration',
  'Media Uploads',
  'Review & Publish'
];

export default function CreateEventPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('concert');
  const [status] = useState<EventStatus>(EventStatus.PUBLISHED);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ticketSalesCloseMode, setTicketSalesCloseMode] = useState<string>('EVENT_START');
  const [ticketSalesCloseDate, setTicketSalesCloseDate] = useState('');
  const [tags, setTags] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [requireTerms, setRequireTerms] = useState(true);
  const [requireAgeConfirmation, setRequireAgeConfirmation] = useState(false);
  const [ageRestriction, setAgeRestriction] = useState<number | ''>(18);
  const [coverImage, setCoverImage] = useState<CloudinaryImage | null>(null);
  const [posterImage, setPosterImage] = useState<CloudinaryImage | null>(null);
  const [galleryImages, setGalleryImages] = useState<CloudinaryImage[]>([]);
  const [tiers, setTiers] = useState<TicketTierInput[]>([defaultTier()]);
  const [ticketingType, setTicketingType] = useState<'custom' | 'profile'>('custom');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [overrides, setOverrides] = useState<Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>>({});
  const [error, setError] = useState('');
  const [venueName, setVenueName] = useState<string>('');
  const [organizerName, setOrganizerName] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');

  // Queries
  const { data: dbCategories = [] } = useQuery({ queryKey: ['adminCategories'], queryFn: adminGetCategories });
  const { data: dbTiers = [] } = useQuery({ queryKey: ['adminTiers'], queryFn: adminGetTiers });
  const { data: dbProfiles = [] } = useQuery({ queryKey: ['adminTicketProfiles'], queryFn: adminGetTicketProfiles });

  const activeProfile = dbProfiles.find((p: TicketProfile) => p._id === selectedProfileId);

  const handleOverrideChange = (tier: string, field: 'price' | 'totalCapacity' | 'isActive', value: number | boolean | undefined) => {
    setOverrides((prev) => ({
      ...prev,
      [tier]: { ...(prev[tier] || {}), [field]: value },
    }));
  };

  const createMutation = useMutation({
    mutationFn: adminCreateEvent,
    onSuccess: () => router.push('/events'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const addTier = () => setTiers((prev) => [...prev, defaultTier()]);
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof TicketTierInput, value: unknown) =>
    setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  const validateStep = (step: number): boolean => {
    setError('');
    if (step === 0) {
      if (!title.trim() || !description.trim()) {
        setError('Title and description are required.');
        return false;
      }
      if (!venueName.trim()) {
        setError('Venue name is required.');
        return false;
      }
    } else if (step === 1) {
      if (!startDate) {
        setError('Start date is required.');
        return false;
      }
    } else if (step === 2) {
      if (ticketingType === 'profile' && !selectedProfileId) {
        setError('Please select a ticket profile.');
        return false;
      }
    } else if (step === 3) {
      if (!coverImage) {
        setError('Cover image is required for event creation.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setError('');
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep(4)) return;

    try {
      const generatedSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, '');
      const isProfileType = ticketingType === 'profile';

      const payload: Partial<AdminEvent> & { bookingMode?: string } = {
        title: title.trim(),
        slug: generatedSlug,
        description: description.trim(),
        category,
        status,
        bookingMode: BookingMode.GENERAL_ADMISSION,
        bannerImage: coverImage!,
        posterImage: posterImage ?? undefined,
        galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
        venue: venueName.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        isFeatured,
        requireTerms,
        requireAgeConfirmation,
        ageRestriction: requireAgeConfirmation && ageRestriction ? Number(ageRestriction) : undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        highlights: Array.from(new Set(highlightsInput.split(',').map((h) => h.trim()).filter(Boolean))),
        ticketSalesCloseMode,
        refundPolicy: refundPolicy.trim() || undefined,
        organizerName: organizerName.trim() || undefined,
      };

      if (ticketSalesCloseMode === 'CUSTOM_DATE' && ticketSalesCloseDate) {
        payload.ticketSalesCloseDate = new Date(ticketSalesCloseDate).toISOString();
      }

      if (isProfileType) {
        payload.ticketProfileId = selectedProfileId;
        payload.ticketOverrides = Object.entries(overrides)
          .map(([tier, vals]) => ({
            tier,
            totalCapacity: vals.totalCapacity !== undefined ? vals.totalCapacity : undefined,
            isActive: vals.isActive !== undefined ? vals.isActive : undefined,
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

      createMutation.mutate(payload);
    } catch (err) {
      setError(extractApiError(err).message || 'Failed to handle event creation');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Create Event</h1>
          <p className="text-text-muted text-sm mt-0.5">Fill in the details below</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Cancel
        </button>
      </div>

      <div className="px-4 py-6 bg-surface border border-border-subtle rounded-xl mb-8">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          aria-live="polite"
          className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
          {error}
        </motion.div>
      )}

      {/* STEP 1: Basic Information */}
      {currentStep === 0 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <EventBasicInfoSection
            title={title} setTitle={setTitle}
            category={category} setCategory={setCategory}
            description={description} setDescription={setDescription}
            organizerName={organizerName} setOrganizerName={setOrganizerName}
            highlightsInput={highlightsInput} setHighlightsInput={setHighlightsInput}
            refundPolicy={refundPolicy} setRefundPolicy={setRefundPolicy}
            dbCategories={dbCategories}
            venueField={<EventVenueSection venueName={venueName} setVenueName={setVenueName} />}
            publishField={null}
          />
        </motion.div>
      )}

      {/* STEP 2: Schedule */}
      {currentStep === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <EventScheduleSection
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            ticketSalesCloseMode={ticketSalesCloseMode} setTicketSalesCloseMode={setTicketSalesCloseMode}
            ticketSalesCloseDate={ticketSalesCloseDate} setTicketSalesCloseDate={setTicketSalesCloseDate}
          />
        </motion.div>
      )}

      {/* STEP 3: Ticket Configuration & Requirements */}
      {currentStep === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <EventTicketSection
            ticketingType={ticketingType} setTicketingType={setTicketingType}
            tiers={tiers} addTier={addTier} removeTier={removeTier} updateTier={updateTier}
            dbTiers={dbTiers} selectedProfileId={selectedProfileId} setSelectedProfileId={setSelectedProfileId}
            setOverrides={setOverrides} dbProfiles={dbProfiles} activeProfile={activeProfile}
            overrides={overrides} handleOverrideChange={handleOverrideChange} title={title}
          />
          <EventRequirementsCard
            tags={tags} setTags={setTags}
            isFeatured={isFeatured} setIsFeatured={setIsFeatured}
            requireTerms={requireTerms} setRequireTerms={setRequireTerms}
            requireAgeConfirmation={requireAgeConfirmation} setRequireAgeConfirmation={setRequireAgeConfirmation}
            ageRestriction={ageRestriction} setAgeRestriction={setAgeRestriction}
          />
        </motion.div>
      )}

      {/* STEP 4: Media Uploads */}
      {currentStep === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <EventMediaSection
            coverImage={coverImage} setCoverImage={setCoverImage}
            posterImage={posterImage} setPosterImage={setPosterImage}
            galleryImages={galleryImages} setGalleryImages={setGalleryImages}
          />
        </motion.div>
      )}

      {/* STEP 5: Review & Publish */}
      {currentStep === 4 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <EventReviewSection
            title={title} category={category} description={description} venueName={venueName}
            status={status} startDate={startDate} endDate={endDate}
            ticketSalesCloseMode={ticketSalesCloseMode} ticketSalesCloseDate={ticketSalesCloseDate}
            requireTerms={requireTerms} requireAgeConfirmation={requireAgeConfirmation}
            ageRestriction={ageRestriction} tags={tags} isFeatured={isFeatured}
            ticketingType={ticketingType} tiers={tiers} selectedProfileId={selectedProfileId}
            coverImage={coverImage} posterImage={posterImage} galleryImages={galleryImages}
            onEditStep={setCurrentStep}
          />
        </motion.div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40 lg:left-64">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? () => router.back() : handlePrev}
          >
            {currentStep === 0 ? 'Cancel' : 'Previous'}
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button type="button" variant="primary" onClick={handleNext}>
              Next Step
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Publishing...' : 'Review & Publish'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
