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
import { AdminFormActions } from '@mad/ui';

import { EventBasicInfoSection, EventScheduleSection, EventVenueSection, EventTicketSection, EventMediaSection, EventPublishSection, defaultTier, TicketTierInput, CloudinaryImage } from './_components';

export default function CreateEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('concert');
  const [status, setStatus] = useState<EventStatus>(EventStatus.DRAFT);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [requireTerms, setRequireTerms] = useState(true);
  const [requireAgeConfirmation, setRequireAgeConfirmation] = useState(false);
  const [ageRestriction, setAgeRestriction] = useState<number | ''>(18);
  const [coverImage, setCoverImage] = useState<CloudinaryImage | null>(null);
  const [posterImage, setPosterImage] = useState<CloudinaryImage | null>(null);
  const [galleryImages, setGalleryImages] = useState<CloudinaryImage[]>([]);
  const [tiers, setTiers] = useState<TicketTierInput[]>([defaultTier()]);

  // Ticket Profile and Overrides state
  const [ticketingType, setTicketingType] = useState<'custom' | 'profile'>('custom');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [overrides, setOverrides] = useState<Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>>({});

  const [error, setError] = useState('');
  const [venueName, setVenueName] = useState<string>('');
  const [organizerName, setOrganizerName] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');

  // Fetch live categories from database
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: adminGetCategories,
  });

  // Fetch live ticket tiers from database
  const { data: dbTiers = [] } = useQuery({
    queryKey: ['adminTiers'],
    queryFn: adminGetTiers,
  });

  // Fetch live ticket profiles
  const { data: dbProfiles = [] } = useQuery({
    queryKey: ['adminTicketProfiles'],
    queryFn: adminGetTicketProfiles,
  });

  const activeProfile = dbProfiles.find((p: TicketProfile) => p._id === selectedProfileId);

  const handleOverrideChange = (tier: string, field: 'price' | 'totalCapacity' | 'isActive', value: number | boolean | undefined) => {
    setOverrides((prev) => ({
      ...prev,
      [tier]: {
        ...(prev[tier] || {}),
        [field]: value,
      },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim() || !startDate) {
      setError('Title, description, and start date are required.');
      return;
    }

    if (!venueName.trim()) {
      setError('Venue name is required.');
      return;
    }

    try {
      if (!coverImage) {
        setError('Cover image is required for event creation.');
        return;
      }

      // Generate slug from title if not provided
      const generatedSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, '');

      const isProfileType = ticketingType === 'profile';

      const payload: Partial<AdminEvent> & { bookingMode?: string } = {
        title: title.trim(),
        slug: generatedSlug,
        description: description.trim(),
        category,
        status,
        bookingMode: BookingMode.GENERAL_ADMISSION,
        bannerImage: coverImage,
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
        highlights: highlightsInput.split(',').map(h => h.trim()).filter(Boolean),
        refundPolicy: refundPolicy.trim() || undefined,
        organizerName: organizerName.trim() || undefined,
      };

      if (isProfileType) {
        if (!selectedProfileId) {
          setError('Please select a ticket profile.');
          return;
        }
        payload.ticketProfileId = selectedProfileId;
        payload.ticketOverrides = Object.entries(overrides)
          .map(([tier, vals]) => ({
            tier,
            totalCapacity: vals.totalCapacity !== undefined ? vals.totalCapacity : undefined,
            isActive: vals.isActive !== undefined ? vals.isActive : undefined,
          }))
          .filter((o) => o.totalCapacity !== undefined || o.isActive !== undefined);

        // EVT-008A: Temporary compatibility workaround.
        // Profile-based event creation still requires totalCapacity >= 1.
        // Remove when the profile create contract lets the server derive capacity without a placeholder.
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
      setError(extractApiError(err).message || 'Failed to handle venue creation');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Create Event</h1>
          <p className="text-text-muted text-sm mt-0.5">Fill in the details below</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            aria-live="polite"
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
            {error}
          </motion.div>
        )}

        <EventMediaSection
          coverImage={coverImage}
          setCoverImage={setCoverImage}
          posterImage={posterImage}
          setPosterImage={setPosterImage}
          galleryImages={galleryImages}
          setGalleryImages={setGalleryImages}
        />

        <EventBasicInfoSection
          title={title}
          setTitle={setTitle}
          category={category}
          setCategory={setCategory}
          description={description}
          setDescription={setDescription}
          organizerName={organizerName}
          setOrganizerName={setOrganizerName}
          highlightsInput={highlightsInput}
          setHighlightsInput={setHighlightsInput}
          refundPolicy={refundPolicy}
          setRefundPolicy={setRefundPolicy}
          dbCategories={dbCategories}
          venueField={
            <EventVenueSection venueName={venueName} setVenueName={setVenueName} />
          }
          publishField={
            <EventPublishSection status={status} setStatus={setStatus} />
          }
        />

        <EventScheduleSection
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />

        <EventTicketSection
          ticketingType={ticketingType}
          setTicketingType={setTicketingType}
          tiers={tiers}
          addTier={addTier}
          removeTier={removeTier}
          updateTier={updateTier}
          dbTiers={dbTiers}
          selectedProfileId={selectedProfileId}
          setSelectedProfileId={setSelectedProfileId}
          setOverrides={setOverrides}
          dbProfiles={dbProfiles}
          activeProfile={activeProfile}
          overrides={overrides}
          handleOverrideChange={handleOverrideChange}
          title={title}
        />

        <EventRequirementsCard
          tags={tags}
          setTags={setTags}
          isFeatured={isFeatured}
          setIsFeatured={setIsFeatured}
          requireTerms={requireTerms}
          setRequireTerms={setRequireTerms}
          requireAgeConfirmation={requireAgeConfirmation}
          setRequireAgeConfirmation={setRequireAgeConfirmation}
          ageRestriction={ageRestriction}
          setAgeRestriction={setAgeRestriction}
        />

        <AdminFormActions
          isPending={createMutation.isPending}
          onCancel={() => router.back()}
          submitLabel="Create Event"
          pendingLabel="Creating..."
          submitId="event-submit"
        />
      </form>
    </div>
  );
}
