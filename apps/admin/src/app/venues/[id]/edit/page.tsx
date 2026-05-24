'use client';

import { Venue } from '@mad/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { CloudinaryUpload } from '@/components/cloudinary-upload';
import { adminGetVenue, adminUpdateVenue } from '@/lib/api/admin/venue.service';
import { extractApiError } from '@/lib/api/client';


interface CloudinaryAsset {
  url: string;
  publicId: string;
  alt?: string;
}

export default function EditVenuePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Basic Info
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState<number | ''>('');

  // Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');

  // Coordinates
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');

  // Contact & Extras
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [amenities, setAmenities] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Gallery
  const [images, setImages] = useState<CloudinaryAsset[]>([]);
  const [error, setError] = useState('');

  // Fetch current venue
  const { data: venue, isLoading } = useQuery({
    queryKey: ['admin-venue', id],
    queryFn: () => adminGetVenue(id),
    enabled: !!id,
  });

  // Prepopulate state
  useEffect(() => {
    if (venue) {
      setName(venue.name || '');
      setSlug(venue.slug || '');
      setDescription(venue.description || '');
      setCapacity(venue.capacity ?? '');
      setStreet(venue.address?.street || '');
      setCity(venue.address?.city || '');
      setState(venue.address?.state || '');
      setPincode(venue.address?.pincode || '');
      setCountry(venue.address?.country || 'India');
      setLat(venue.address?.coordinates?.lat ?? '');
      setLng(venue.address?.coordinates?.lng ?? '');
      setContactEmail(venue.contactEmail || '');
      setContactPhone(venue.contactPhone || '');
      setAmenities(venue.amenities?.join(', ') || '');
      setIsActive(venue.isActive ?? true);
      setImages(venue.images || []);
    }
  }, [venue]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Venue>) => adminUpdateVenue(id, payload),
    onSuccess: () => router.push('/venues'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const handleImageChange = (index: number, asset: CloudinaryAsset | null) => {
    if (asset === null) {
      setImages((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setImages((prev) => prev.map((img, idx) => (idx === index ? asset : img)));
    }
  };

  const handleAddImage = (asset: CloudinaryAsset | null) => {
    if (asset) {
      setImages((prev) => [...prev, asset]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !city.trim() || !state.trim() || !pincode.trim() || capacity === '') {
      setError('Name, city, state, pincode, and capacity are required.');
      return;
    }

    const payload: Partial<Venue> = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      capacity: Number(capacity),
      address: {
        street: street.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: country.trim(),
        coordinates: lat !== '' && lng !== '' ? { lat: Number(lat), lng: Number(lng) } : undefined,
      },
      images,
      amenities: amenities.split(',').map((a) => a.trim()).filter(Boolean),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      isActive,
    };

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">Loading venue parameters...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Edit Venue</h1>
          <p className="text-text-muted text-sm mt-0.5">Modify venue particulars</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Gallery Section */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
          <h2 className="text-white font-semibold">Venue Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((img, index) => (
              <div key={img.publicId} className="relative">
                <CloudinaryUpload
                  folder="venues"
                  value={img}
                  onChange={(asset) => handleImageChange(index, asset)}
                  aspectRatio="aspect-video"
                  label=""
                />
              </div>
            ))}
            {images.length < 10 && (
              <div>
                <CloudinaryUpload
                  folder="venues"
                  value={null}
                  onChange={handleAddImage}
                  aspectRatio="aspect-video"
                  label="Add Image to Gallery"
                />
              </div>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Basic Information</h2>
          <Field label="Venue Name *">
            <input
              id="venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NSCI Dome, Worli"
              required
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug">
              <input
                id="venue-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. nsci-dome-worli"
                className={inputCls}
              />
            </Field>
            <Field label="Total Capacity *">
              <input
                id="venue-capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 5000"
                required
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Description (optional)">
            <textarea
              id="venue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the venue features, history, and layout..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        {/* Address */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Location / Address</h2>
          <Field label="Street / Area">
            <input
              id="venue-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="e.g. Lala Lajpatrai Marg, Lotus Colony"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City *">
              <input
                id="venue-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                required
                className={inputCls}
              />
            </Field>
            <Field label="State *">
              <input
                id="venue-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
                required
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pincode *">
              <input
                id="venue-pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 400018"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Country">
              <input
                id="venue-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Coordinates */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Coordinates (optional)</h2>
            <span className="text-[10px] text-text-muted">Used for map pins</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude">
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={lat}
                onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 18.9902"
                className={inputCls}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={lng}
                onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 72.8130"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Contact & Extra Details */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Contact & Extras</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Email">
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="info@nsci.com"
                className={inputCls}
              />
            </Field>
            <Field label="Contact Phone">
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="02224938813"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Amenities (comma-separated)">
            <input
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              placeholder="e.g. AC, Parking, Bar, Valet, VIP Lounge"
              className={inputCls}
            />
          </Field>
          <div className="flex items-center gap-3 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              id="venue-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-accent-purple rounded"
            />
            <label htmlFor="venue-active" className="text-text-secondary text-sm">
              Mark this venue as active for scheduling events
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex gap-4 pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="venue-submit"
            type="submit"
            disabled={updateMutation.isPending}
            className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
          >
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
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
