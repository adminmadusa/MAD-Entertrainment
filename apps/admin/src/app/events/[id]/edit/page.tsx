'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { EventAdditionalDetailsCard } from '@/components/events/EventAdditionalDetailsCard';
import { EventAttendanceCard } from '@/components/events/EventAttendanceCard';
import { EventBasicInfoCard } from '@/components/events/EventBasicInfoCard';
import { EventMediaCard } from '@/components/events/EventMediaCard';
import { EventRequirementsCard } from '@/components/events/EventRequirementsCard';
import { EventScheduleCard } from '@/components/events/EventScheduleCard';
import { EventTicketingCard, type TicketTierInput } from '@/components/events/EventTicketingCard';
import { adminGetCategories } from '@/lib/api/admin/category.service';
import { adminGetEvent, adminUpdateEvent, type AdminEventUpdatePayload, type CloudinaryImage, } from '@/lib/api/admin/event.service';
import { adminGetTicketProfiles } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';
import { BookingMode, TicketTier, EventStatus, EVENT_STATUS_TRANSITIONS, type EventLifecycleStatus, deriveEventLifecycleState } from '@mad/shared';
import { AdminFormActions } from '@mad/ui';

const defaultTier = (): TicketTierInput => ({
  name: 'general',
  price: '',
  capacity: '',
});

const isEventLifecycleStatus = (status: EventStatus): status is EventLifecycleStatus =>
  Object.prototype.hasOwnProperty.call(EVENT_STATUS_TRANSITIONS, status);

export default function EditEventPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

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
  const [error, setError] = useState('');
  const [venue, setVenue] = useState<string>('');
  const [organizerName, setOrganizerName] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');

  // Ticket Profile and Overrides state
  const [ticketingType, setTicketingType] = useState<'custom' | 'profile'>('custom');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [overrides, setOverrides] = useState<
    Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>
  >({});

  // Fetch Event details
  const { data: event, isLoading: isEventLoading } = useQuery({ queryKey: ['admin-event', id], queryFn: () => adminGetEvent(id) });

  // Fetch live categories from database
  const { data: dbCategories = [] } = useQuery({ queryKey: ['adminCategories'], queryFn: adminGetCategories });

  // Fetch live ticket tiers from database
  const { data: dbTiers = [] } = useQuery({ queryKey: ['adminTiers'], queryFn: adminGetTiers });

  // Fetch live ticket profiles
  const { data: dbProfiles = [] } = useQuery({ queryKey: ['adminTicketProfiles'], queryFn: adminGetTicketProfiles });

  const activeProfile = dbProfiles.find((p) => p._id === selectedProfileId);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setCategory(event.category || 'concert');
      setStatus(event.status || EventStatus.DRAFT);
      setStartDate(event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '');
      setEndDate(event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '');
      setBookingStartDate(event.bookingStartDate ? new Date(event.bookingStartDate).toISOString().slice(0, 16) : '');
      setBookingEndDate(event.bookingEndDate ? new Date(event.bookingEndDate).toISOString().slice(0, 16) : '');
      setVenue(event.venue || '');
      setOrganizerName(event.organizerName || '');
      setRefundPolicy(event.refundPolicy || '');
      setHighlightsInput(event.highlights?.join(', ') || '');
      setTags(event.tags?.join(', ') || '');
      setRequireTerms(event.requireTerms ?? true);
      setRequireAgeConfirmation(!!event.requireAgeConfirmation);
      setAgeRestriction(event.ageRestriction ?? 18);
      setBannerImage(event.bannerImage || null);
      setPosterImage(event.posterImage || null);
      setGalleryImages(event.galleryImages || []);

      if (event.ticketProfileId) {
        setTicketingType('profile');
        setSelectedProfileId(event.ticketProfileId);
        const ovs: Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }> = {};
        event.ticketOverrides?.forEach((ov) => {
          ovs[ov.tier] = { price: ov.price, totalCapacity: ov.totalCapacity, isActive: ov.isActive };
        });
        setOverrides(ovs);
      } else {
        setTicketingType('custom');
        setTiers(event.ticketTiers && event.ticketTiers.length > 0
          ? event.ticketTiers.map((t) => ({ name: t.name, price: t.price, capacity: t.totalCapacity || t.quantity || 100 }))
          : [defaultTier()]);
      }
    }
  }, [event]);

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

  const updateMutation = useMutation({
    mutationFn: (payload: AdminEventUpdatePayload) => adminUpdateEvent(id, payload),
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

    if (!title.trim() || !description.trim() || !startDate) return setError('Title, description, and start date are required.');
    if (!venue.trim()) return setError('Venue name is required.');

    try {
      if (!bannerImage) return setError('Cover image is required for event update.');

      const generatedSlug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^[-]+|[-]+$/g, '');

      const isProfileType = ticketingType === 'profile';

      const payload: AdminEventUpdatePayload & Record<string, unknown> = {
        title: title.trim(),
        slug: generatedSlug,
        description: description.trim(),
        category,
        status,
        eventVersion: event?.eventVersion,
        bookingMode: BookingMode.GENERAL_ADMISSION,
        bannerImage,
        posterImage: posterImage ?? undefined,
        galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
        venue: venue.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        bookingStartDate: bookingStartDate ? new Date(bookingStartDate).toISOString() : undefined,
        bookingEndDate: bookingEndDate ? new Date(bookingEndDate).toISOString() : undefined,
        requireTerms,
        requireAgeConfirmation,
        ageRestriction: requireAgeConfirmation && ageRestriction ? Number(ageRestriction) : undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        highlights: Array.from(new Set(highlightsInput.split(',').map((h) => h.trim()).filter(Boolean))),
        refundPolicy: refundPolicy.trim() || undefined,
        organizerName: organizerName.trim() || undefined,
      };

      if (isProfileType) {
        if (!selectedProfileId) return setError('Please select a ticket profile.');
        payload.ticketProfileId = selectedProfileId;
        payload.ticketOverrides = Object.entries(overrides)
          .map(([tier, vals]) => ({
            tier,
            totalCapacity: vals.totalCapacity,
            isActive: vals.isActive,
          }))
          .filter((o) => o.totalCapacity !== undefined || o.isActive !== undefined);
        payload.ticketTiers = [];
      } else {
        payload.ticketProfileId = null;
        payload.ticketOverrides = [];
        payload.ticketTiers = tiers.map((t) => ({
          name: t.name,
          price: Number(t.price),
          capacity: Number(t.capacity),
          groupSize: 1,
          minPerBooking: 1,
          discount: 0,
          taxPercent: 0,
          isAvailable: true,
          tier: Object.values(TicketTier).includes(t.name as TicketTier) ? (t.name as TicketTier) : TicketTier.CUSTOM,
          slug: t.name,
          totalCapacity: Number(t.capacity),
        }));
      }

      updateMutation.mutate(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
    }
  };

  if (isEventLoading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-purple" />
      </div>
    );
  }

  const allowedNextStatuses = isEventLifecycleStatus(status) ? EVENT_STATUS_TRANSITIONS[status] : [];
  const statusOptions = Array.from(new Set<EventStatus>([status, ...allowedNextStatuses]));

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Edit Event</h1>
          <p className="text-text-muted text-sm mt-0.5">Modify event parameters and ticketing overrides</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      {event && <EventAttendanceCard event={event} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            aria-live="polite"
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        <EventMediaCard
          bannerImage={bannerImage} setBannerImage={setBannerImage}
          posterImage={posterImage} setPosterImage={setPosterImage}
          galleryImages={galleryImages} setGalleryImages={setGalleryImages}
        />

        <EventBasicInfoCard
          title={title} setTitle={setTitle}
          category={category} setCategory={setCategory}
          status={status} setStatus={setStatus}
          lifecycle={deriveEventLifecycleState({ status, startDate, endDate } as any)}
          venue={venue} setVenue={setVenue}
          description={description} setDescription={setDescription}
          dbCategories={dbCategories} statusOptions={statusOptions}
        />

        <EventAdditionalDetailsCard
          organizerName={organizerName} setOrganizerName={setOrganizerName}
          highlightsInput={highlightsInput} setHighlightsInput={setHighlightsInput}
          refundPolicy={refundPolicy} setRefundPolicy={setRefundPolicy}
        />

        <EventScheduleCard
          startDate={startDate} setStartDate={setStartDate}
          endDate={endDate} setEndDate={setEndDate}
          bookingStartDate={bookingStartDate}
          setBookingStartDate={setBookingStartDate}
          bookingEndDate={bookingEndDate}
          setBookingEndDate={setBookingEndDate}
        />

        <EventTicketingCard
          ticketingType={ticketingType} setTicketingType={setTicketingType}
          tiers={tiers} onAddTier={addTier} onRemoveTier={removeTier} onUpdateTier={updateTier}
          selectedProfileId={selectedProfileId} setSelectedProfileId={setSelectedProfileId}
          overrides={overrides} onOverrideChange={handleOverrideChange}
          dbTiers={dbTiers} dbProfiles={dbProfiles}
          activeProfile={activeProfile} eventTitle={title}
        />

        <EventRequirementsCard
          requireTerms={requireTerms} setRequireTerms={setRequireTerms}
          requireAgeConfirmation={requireAgeConfirmation} setRequireAgeConfirmation={setRequireAgeConfirmation}
          ageRestriction={ageRestriction} setAgeRestriction={setAgeRestriction}
          tags={tags} setTags={setTags}
        />

        <AdminFormActions
          onCancel={() => router.back()}
          isPending={updateMutation.isPending}
          submitLabel="Save Changes"
          pendingLabel="Saving..."
          submitId="event-submit"
        />
      </form>
    </div>
  );
}
