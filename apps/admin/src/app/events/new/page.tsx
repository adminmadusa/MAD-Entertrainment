'use client';

import { EventCategory, EVENT_CATEGORY_LABELS } from '@mad/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { CloudinaryUpload } from '@/components/cloudinary-upload';
import { adminCreateEvent } from '@/lib/api/admin/event.service';
import { adminGetVenues } from '@/lib/api/admin/venue.service';
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

export default function CreateEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [category, setCategory] = useState<string>(EventCategory.CONCERT);
  const [status, setStatus] = useState('draft');
  const [bookingMode, setBookingMode] = useState('general_admission');
  const [venueId, setVenueId] = useState('');
  const [showTime, setShowTime] = useState('20:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isAgeRestricted, setIsAgeRestricted] = useState(false);
  const [minimumAge, setMinimumAge] = useState(18);
  const [coverImage, setCoverImage] = useState<CloudinaryImage | null>(null);
  const [tiers, setTiers] = useState<TicketTierInput[]>([defaultTier()]);
  const [error, setError] = useState('');

  // Fetch Venues for selection dropdown
  const { data: venuesData } = useQuery({
    queryKey: ['admin-venues-list'],
    queryFn: () => adminGetVenues({ limit: 100 }),
  });
  const venuesList = venuesData?.items || [];

  // Set default venueId once loaded
  useEffect(() => {
    if (venuesList.length > 0 && !venueId) {
      setVenueId(venuesList[0]._id);
    }
  }, [venuesList, venueId]);

  const createMutation = useMutation({
    mutationFn: adminCreateEvent,
    onSuccess: () => router.push('/events'),
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.errors) {
        const details = Object.entries(apiErr.errors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join('; ');
        setError(`Validation failed — ${details}`);
      } else {
        setError(apiErr.message);
      }
    },
  });

  const addTier = () => setTiers((prev) => [...prev, defaultTier()]);
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof TicketTierInput, value: unknown) =>
    setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim() || !startDate) {
      setError('Title, description, and start date are required.');
      return;
    }

    if (!venueId) {
      setError('Please select a venue.');
      return;
    }

    if (!coverImage) {
      setError('Cover Image is required.');
      return;
    }

    // Auto-generate URL-friendly slug
    const generatedSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const ticketTiers = tiers.map((t) => ({
      tier: t.name,
      name: t.name.toUpperCase(),
      price: Number(t.price),
      totalCapacity: Number(t.capacity),
      groupSize: t.groupSize !== '' ? Number(t.groupSize) : undefined,
      minPerBooking: t.minPerBooking !== '' ? Number(t.minPerBooking) : undefined,
      discount: t.discount !== '' ? Number(t.discount) : undefined,
      taxPercent: t.taxPercent !== '' ? Number(t.taxPercent) : 18,
      availabilityWindow: t.startDate && t.endDate ? {
        startDate: new Date(t.startDate).toISOString(),
        endDate: new Date(t.endDate).toISOString(),
      } : undefined,
      description: t.description || undefined,
      isActive: t.isAvailable,
    }));

    const totalCapacity = ticketTiers.reduce((acc, t) => acc + t.totalCapacity, 0);

    createMutation.mutate({
      title: title.trim(),
      slug: generatedSlug,
      description: description.trim(),
      category,
      status,
      bookingMode,
      startDate: new Date(startDate).toISOString() as never,
      endDate: endDate ? new Date(endDate).toISOString() as never : undefined,
      showTime: showTime.trim(),
      venueId: venueId as any,
      bannerImage: {
        url: coverImage.url,
        publicId: coverImage.publicId,
      } as any,
      ticketTiers: ticketTiers as never,
      totalCapacity,
      isFeatured,
      ageRestriction: isAgeRestricted ? minimumAge : undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    } as any);
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
                {Object.entries(EVENT_CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val} className="bg-background-card">{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select id="event-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="draft" className="bg-background-card">Draft</option>
                <option value="published" className="bg-background-card">Published</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Venue *">
              <select id="event-venue" value={venueId} onChange={(e) => setVenueId(e.target.value)} required className={inputCls}>
                <option value="" disabled className="bg-background-card">Select a venue</option>
                {venuesList.map((v) => (
                  <option key={v._id} value={v._id} className="bg-background-card">{v.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Booking Mode *">
              <select id="event-booking-mode" value={bookingMode} onChange={(e) => setBookingMode(e.target.value)} required className={inputCls}>
                <option value="general_admission" className="bg-background-card">General Admission</option>
                <option value="seat_based" className="bg-background-card">Seat Based</option>
              </select>
            </Field>
          </div>

          <Field label="Full Description *">
            <textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event in detail..." required rows={5}
              className={`${inputCls} resize-none`} />
          </Field>
        </div>

        {/* Schedule */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Schedule</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Start Date & Time *">
              <input id="event-start-date" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputCls} />
            </Field>
            <Field label="End Date & Time">
              <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Show Time (e.g. 20:00) *">
              <input id="event-showtime" value={showTime} onChange={(e) => setShowTime(e.target.value)} placeholder="e.g. 20:00" required className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Ticket Tiers */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Ticket Tiers</h2>
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
                    {TICKET_TIER_NAMES.map((n) => (
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
                <Field label="Capacity">
                  <input type="number" min="1" value={tier.capacity}
                    onChange={(e) => updateTier(i, 'capacity', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="100" required className={inputCls} />
                </Field>
                <Field label="Group Size (Admits X)">
                  <input type="number" min="1" value={tier.groupSize}
                    onChange={(e) => updateTier(i, 'groupSize', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1" className={inputCls} />
                </Field>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <Field label="Min Per Booking">
                  <input type="number" min="1" value={tier.minPerBooking}
                    onChange={(e) => updateTier(i, 'minPerBooking', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1" className={inputCls} />
                </Field>
                <Field label="Discount (₹)">
                  <input type="number" min="0" value={tier.discount}
                    onChange={(e) => updateTier(i, 'discount', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0" className={inputCls} />
                </Field>
                <Field label="Tax Percent (%)">
                  <input type="number" min="0" max="100" value={tier.taxPercent}
                    onChange={(e) => updateTier(i, 'taxPercent', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="18" className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
                <Field label="Available From (Early Bird)">
                  <input type="datetime-local" value={tier.startDate}
                    onChange={(e) => updateTier(i, 'startDate', e.target.value)}
                    className={inputCls} />
                </Field>
                <Field label="Available Until">
                  <input type="datetime-local" value={tier.endDate}
                    onChange={(e) => updateTier(i, 'endDate', e.target.value)}
                    className={inputCls} />
                </Field>
              </div>

              <Field label="Description (optional)">
                <input value={tier.description}
                  onChange={(e) => updateTier(i, 'description', e.target.value)}
                  placeholder="e.g. Standing area, includes 1 drink" className={inputCls} />
              </Field>
            </div>
          ))}
        </div>

        {/* Options */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Options</h2>
          <Field label="Tags (comma-separated)">
            <input value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="EDM, outdoor, live" className={inputCls} />
          </Field>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-accent-purple rounded" />
              <span className="text-text-secondary text-sm">Feature on homepage</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={isAgeRestricted} onChange={(e) => setIsAgeRestricted(e.target.checked)}
                className="w-4 h-4 accent-accent-purple rounded" />
              <span className="text-text-secondary text-sm">Age restricted</span>
            </label>
          </div>
          {isAgeRestricted && (
            <Field label="Minimum Age">
              <input type="number" min={0} max={21} value={minimumAge} onChange={(e) => setMinimumAge(Number(e.target.value))} className={`${inputCls} max-w-24`} />
            </Field>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4 pb-6">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors">
            Cancel
          </button>
          <button id="event-submit" type="submit" disabled={createMutation.isPending}
            className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all">
            {createMutation.isPending ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Shared field wrapper
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
