'use client';

import { EventCategory, EVENT_CATEGORY_LABELS, BookingMode, TicketTier, EventStatus } from '@mad/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { CloudinaryUpload } from '@/components/CloudinaryUpload';
import { adminGetEvent, adminUpdateEvent, AdminEvent } from '@/lib/api/admin/event.service';
import { adminGetCategories } from '@/lib/api/admin/category.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { adminGetTicketProfiles } from '@/lib/api/admin/ticket-profile.service';
import { extractApiError } from '@/lib/api/client';

interface CloudinaryImage { url: string; publicId: string; alt?: string; }

const TICKET_TIER_NAMES = ['general', 'silver', 'gold', 'platinum', 'vip', 'vvip', 'backstage', 'couple', 'group', 'family', 'early_bird', 'custom'];

interface TicketTierInput {
  name: string;
  price: number | '';
  capacity: number | '';
  groupSize: number | '';
  minPerBooking: number | '';
  discount: number | '';
  taxPercent: number | '';
  startDate: string;
  endDate: string;
  description: string;
  isAvailable: boolean;
}

const defaultTier = (): TicketTierInput => ({
  name: 'general', price: '', capacity: '', groupSize: '', minPerBooking: '', discount: '', taxPercent: '', startDate: '', endDate: '', description: '', isAvailable: true,
});

export default function EditEventPage() {
  const { id } = useParams() as { id: string };
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
  const [tiers, setTiers] = useState<TicketTierInput[]>([defaultTier()]);
  const [error, setError] = useState('');
  const [venueName, setVenueName] = useState<string>('');
  const [organizerName, setOrganizerName] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');

  // Ticket Profile and Overrides state
  const [ticketingType, setTicketingType] = useState<'custom' | 'profile'>('custom');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [overrides, setOverrides] = useState<Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }>>({});

  // Fetch Event details
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['admin-event', id],
    queryFn: () => adminGetEvent(id),
  });

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

  const activeProfile = dbProfiles.find((p) => p._id === selectedProfileId);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setCategory(event.category || 'concert');
      setStatus((event.status as EventStatus) || EventStatus.DRAFT);
      setStartDate(event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '');
      setEndDate(event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '');
      setVenueName(event.venue || '');
      setOrganizerName(event.organizerName || '');
      setRefundPolicy(event.refundPolicy || '');
      setHighlightsInput(event.highlights?.join(', ') || '');
      setTags(event.tags?.join(', ') || '');
      setIsFeatured(!!event.isFeatured);
      setRequireTerms(event.requireTerms ?? true);
      setRequireAgeConfirmation(!!event.requireAgeConfirmation);
      setAgeRestriction(event.ageRestriction ?? 18);
      setCoverImage(event.bannerImage || null);

      if (event.ticketProfileId) {
        setTicketingType('profile');
        setSelectedProfileId(event.ticketProfileId);
        
        // Map overrides from event
        const ovs: Record<string, { price?: number; totalCapacity?: number; isActive?: boolean }> = {};
        if (event.ticketOverrides) {
          event.ticketOverrides.forEach((ov) => {
            ovs[ov.tier] = {
              price: ov.price,
              totalCapacity: ov.totalCapacity,
              isActive: ov.isActive,
            };
          });
        }
        setOverrides(ovs);
      } else {
        setTicketingType('custom');
        if (event.ticketTiers && event.ticketTiers.length > 0) {
          setTiers(
            event.ticketTiers.map((t) => ({
              name: t.name,
              price: t.price,
              capacity: t.totalCapacity || t.quantity || 100,
              groupSize: t.groupSize || 1,
              minPerBooking: t.minPerBooking || 1,
              discount: t.discount || 0,
              taxPercent: t.taxPercent || 0,
              startDate: '',
              endDate: '',
              description: t.description || '',
              isAvailable: t.isActive !== false,
            }))
          );
        } else {
          setTiers([defaultTier()]);
        }
      }
    }
  }, [event]);

  const handleOverrideChange = (tier: string, field: 'price' | 'totalCapacity' | 'isActive', value: number | boolean | undefined) => {
    setOverrides((prev) => ({
      ...prev,
      [tier]: {
        ...(prev[tier] || {}),
        [field]: value,
      },
    }));
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<AdminEvent>) => adminUpdateEvent(id, payload),
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
        setError('Cover image is required for event update.');
        return;
      }

      const generatedSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, '');

      const isProfileType = ticketingType === 'profile';
      
      const payload: Partial<AdminEvent> & Record<string, unknown> = {
        title: title.trim(),
        slug: generatedSlug,
        description: description.trim(),
        category,
        status,
        bookingMode: BookingMode.GENERAL_ADMISSION,
        bannerImage: coverImage ?? undefined,
        venue: venueName.trim(),
        startDate: new Date(startDate).toISOString() as never,
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
        
        // Remove normal ticketTiers to let server compile from profile
        payload.ticketTiers = [];
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

        payload.ticketProfileId = null; // Clear linked profile
        payload.ticketOverrides = [];
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

  const ticketsCheckedIn = event?.ticketsCheckedIn ?? 0;
  const ticketsSold = event?.ticketsSold ?? 0;

  let attendanceStatus = 'NO ATTENDANCE';
  let attendanceColorClass = 'bg-red-500/10 text-red-400 border-red-500/30';

  if (ticketsCheckedIn > 0) {
    if (ticketsCheckedIn === ticketsSold) {
      attendanceStatus = 'FULLY ATTENDED';
      attendanceColorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    } else {
      attendanceStatus = 'PARTIALLY ATTENDED';
      attendanceColorClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    }
  }

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

      {/* Event Attendance Section */}
      {event && (
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-base">Event Attendance</h2>
              <p className="text-text-muted text-xs mt-0.5">Real-time gate check-in telemetry</p>
            </div>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${attendanceColorClass}`}>
              {attendanceStatus}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center bg-white/3 rounded-xl p-4 text-sm">
            <div className="space-y-1">
              <span className="text-text-muted text-[10px] uppercase tracking-wider block font-semibold">Tickets Sold</span>
              <span className="text-white font-black text-xl">{event.ticketsSold ?? 0}</span>
            </div>
            <div className="space-y-1 border-x border-white/5">
              <span className="text-text-muted text-[10px] uppercase tracking-wider block font-semibold">Checked In</span>
              <span className="text-emerald-400 font-black text-xl">{event.ticketsCheckedIn ?? 0}</span>
            </div>
            <div className="space-y-1">
              <span className="text-text-muted text-[10px] uppercase tracking-wider block font-semibold">Remaining</span>
              <span className="text-white font-black text-xl">{event.ticketsRemaining ?? 0}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-secondary font-medium">
              <span>Check-in Progress</span>
              <span>{Math.round(event.attendancePercentage ?? 0)}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, event.attendancePercentage ?? 0))}%` }}
              />
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 gap-4 pt-2 text-xs border-t border-white/5">
            <div className="flex items-center justify-between px-3 py-2 bg-white/3 rounded-lg">
              <span className="text-text-muted font-medium">Attendance Rate</span>
              <span className="text-emerald-400 font-bold">{Math.round(event.attendancePercentage ?? 0)}%</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-white/3 rounded-lg">
              <span className="text-text-muted font-medium">No Show Rate</span>
              <span className="text-red-400 font-bold">{Math.round(event.noShowPercentage ?? 0)}%</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
            {error}
          </motion.div>
        )}

        {/* Cover Image */}
        <div className="glass rounded-2xl border border-border-subtle p-6">
          <CloudinaryUpload
            folder="events"
            value={coverImage}
            onChange={setCoverImage}
            label="Cover Image"
            aspectRatio="aspect-video"
            id="event-cover-image"
          />
        </div>

        {/* Basic Info */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Basic Information</h2>
          <Field label="Event Title *">
            <input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunburn Festival 2025" required
              className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select id="event-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {dbCategories.length > 0
                  ? dbCategories.map((cat) => (
                      <option key={cat._id} value={cat.slug} className="bg-background-card">
                        {cat.name}
                      </option>
                    ))
                  : Object.entries(EVENT_CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val} className="bg-background-card">{label}</option>
                    ))}
              </select>
            </Field>
            <Field label="Status">
              <select id="event-status" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} className={inputCls}>
                <option value={EventStatus.DRAFT} className="bg-background-card">Draft</option>
                <option value={EventStatus.PUBLISHED} className="bg-background-card">Published</option>
                <option value={EventStatus.CANCELLED} className="bg-background-card">Cancelled</option>
                <option value={EventStatus.SOLD_OUT} className="bg-background-card">Sold Out</option>
                <option value={EventStatus.COMPLETED} className="bg-background-card">Completed</option>
              </select>
            </Field>
            <Field label="Venue *">
              <div className="relative">
                <input
                  id="event-venue"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Enter venue name"
                  required
                  className={inputCls + " pl-10"}
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 2c-4.418 0-8 1.79-8 4v3h16v-3c0-2.21-3.582-4-8-4z" />
                  </svg>
                </span>
              </div>
            </Field>
          </div>
          <Field label="Full Description *">
            <textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event in detail..." required rows={5}
              className={`${inputCls} resize-none`} />
          </Field>
        </div>

        {/* Additional Details */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Additional Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Organizer Name">
              <input id="event-organizer" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. Ellen Colby, The MARM Farm"
                className={inputCls} />
            </Field>
            <Field label="Highlights (comma separated)">
              <input id="event-highlights" value={highlightsInput} onChange={(e) => setHighlightsInput(e.target.value)}
                placeholder="e.g. 12 hours, In person, Family friendly"
                className={inputCls} />
            </Field>
          </div>
          <Field label="Refund Policy">
            <textarea id="event-refund-policy" value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)}
              placeholder="e.g. Refunds up to 7 days before event" rows={2}
              className={`${inputCls} resize-none`} />
          </Field>
        </div>

        {/* Schedule */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Schedule</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date & Time *">
              <input id="event-start-date" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputCls} />
            </Field>
            <Field label="End Date & Time">
              <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Ticket Configuration */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-white font-semibold text-base">Ticketing Configuration</h2>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setTicketingType('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ticketingType === 'custom'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Custom Tiers
              </button>
              <button
                type="button"
                onClick={() => setTicketingType('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ticketingType === 'profile'
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Ticket Profile
              </button>
            </div>
          </div>

          {ticketingType === 'custom' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm font-medium">Define custom ticket tiers for this event</span>
                <button type="button" onClick={addTier}
                  className="text-accent-purple text-sm font-medium hover:text-accent-purple-light transition-colors">
                  + Add Tier
                </button>
              </div>
              {tiers.map((tier, i) => (
                <div key={i} className="p-4 bg-white/3 rounded-xl border border-border-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm font-medium capitalize">Tier {i + 1}</span>
                    {tiers.length > 1 && (
                      <button type="button" onClick={() => removeTier(i)} className="text-error text-xs hover:underline">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Tier Name">
                      <select value={tier.name} onChange={(e) => updateTier(i, 'name', e.target.value)} className={inputCls}>
                        {dbTiers.length > 0
                          ? dbTiers.map((t) => (
                              <option key={t._id} value={t.slug} className="bg-background-card capitalize">
                                {t.name}
                              </option>
                            ))
                          : TICKET_TIER_NAMES.map((n) => (
                              <option key={n} value={n} className="bg-background-card capitalize">{n}</option>
                            ))}
                      </select>
                    </Field>
                    <Field label="Price (₹)">
                      <input type="number" min="0" value={tier.price}
                        onChange={(e) => updateTier(i, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0" required className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Capacity *">
                      <input type="number" min="1" value={tier.capacity}
                        onChange={(e) => updateTier(i, 'capacity', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="100" required className={inputCls} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Select Ticket Profile *">
                <select
                  value={selectedProfileId}
                  onChange={(e) => {
                    setSelectedProfileId(e.target.value);
                    setOverrides({});
                  }}
                  required={ticketingType === 'profile'}
                  className={inputCls}
                >
                  <option value="" className="bg-background-card">-- Select a Profile --</option>
                  {dbProfiles.map((p) => (
                    <option key={p._id} value={p._id} className="bg-background-card">
                      {p.name} ({p.groups?.length || 0} groups)
                    </option>
                  ))}
                </select>
              </Field>

              {activeProfile && (
                <div className="space-y-6 pt-4 border-t border-white/5">
                  <h3 className="text-white font-bold text-sm">Profile Preview & Event-Specific Overrides</h3>
                  {activeProfile.groups?.map((group, gIdx) => (
                    <div key={`${group.slug}-${gIdx}`} className="space-y-3 p-4 bg-white/3 rounded-xl border border-white/5">
                      <h4 className="text-accent-purple-light font-bold text-sm">{group.name}</h4>
                      <p className="text-text-muted text-xs">{group.description}</p>
                      
                      <div className="space-y-3 pt-2">
                        {group.tickets?.map((ticket, tIdx) => {
                          const override = overrides[ticket.tier] || {};
                          return (
                            <div key={`${ticket.tier}-${tIdx}`} className="p-3 bg-background rounded-lg border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <span className="text-sm font-bold text-white block">{ticket.name.replace(/\{eventName\}/g, title || 'Event')}</span>
                                <span className="text-xs text-text-muted">
                                  Tier: <strong className="text-text-secondary">{ticket.tier}</strong> &bull; Price: <strong className="text-text-secondary">₹{ticket.price}</strong>
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-text-muted uppercase block">Capacity</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={override.totalCapacity !== undefined ? override.totalCapacity : ''}
                                    placeholder={`${ticket.totalCapacity} (default)`}
                                    onChange={(e) =>
                                      handleOverrideChange(
                                        ticket.tier,
                                        'totalCapacity',
                                        e.target.value === '' ? undefined : Number(e.target.value)
                                      )
                                    }
                                    className="w-28 px-3 py-1.5 rounded-lg bg-background-card border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                                  />
                                </div>
                                <div className="space-y-1 pt-4">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={override.isActive !== undefined ? override.isActive : true}
                                      onChange={(e) =>
                                        handleOverrideChange(ticket.tier, 'isActive', e.target.checked)
                                      }
                                      className="w-3.5 h-3.5 accent-accent-purple rounded"
                                    />
                                    <span className="text-[11px] text-text-secondary font-medium">Visible</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Options</h2>
          <Field label="Tags (comma separated)">
            <input value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="EDM, outdoor, live" className={inputCls} />
          </Field>
          
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-accent-purple rounded" />
              <span className="text-text-secondary text-sm">Feature on homepage</span>
            </label>
          </div>
        </div>

        {/* Registration Requirements */}
        <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-white font-bold text-lg mb-2">Registration Requirements</h3>
          <div className="space-y-4 text-sm">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireTerms}
                onChange={(e) => setRequireTerms(e.target.checked)}
                className="w-4 h-4 rounded bg-background border-white/20 text-accent-purple focus:ring-accent-purple"
              />
              <span className="text-text-secondary">Require Terms & Conditions</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireAgeConfirmation}
                onChange={(e) => setRequireAgeConfirmation(e.target.checked)}
                className="w-4 h-4 rounded bg-background border-white/20 text-accent-purple focus:ring-accent-purple"
              />
              <span className="text-text-secondary">Require Age Confirmation</span>
            </label>
            {requireAgeConfirmation && (
              <div className="pl-7">
                <label className="block text-text-secondary mb-2">Age Requirement</label>
                <select
                  value={ageRestriction}
                  onChange={(e) => setAgeRestriction(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-4 py-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
                >
                  <option value={18}>18</option>
                  <option value={21}>21</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                  <option value="">Custom</option>
                </select>
                {ageRestriction === '' && (
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter age"
                    onBlur={(e) => {
                      if (e.target.value) setAgeRestriction(Number(e.target.value));
                    }}
                    className="w-full px-4 py-2 mt-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4 pb-6">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors">
            Cancel
          </button>
          <button id="event-submit" type="submit" disabled={updateMutation.isPending}
            className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all">
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-text-secondary text-sm font-medium block">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';
