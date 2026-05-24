'use client';

import { PopupCampaign } from '@mad/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { CloudinaryUpload } from '@/components/cloudinary-upload';
import { adminGetPopup, adminUpdatePopup } from '@/lib/api/admin/popup.service';
import { extractApiError } from '@/lib/api/client';


interface CloudinaryAsset {
  url: string;
  publicId: string;
  alt?: string;
}

export default function EditPopupPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [trigger, setTrigger] = useState('on_load');
  const [triggerDelay, setTriggerDelay] = useState(3000);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Target options
  const [showOnPages, setShowOnPages] = useState('');
  const [linkedEventId, setLinkedEventId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Image banner
  const [image, setImage] = useState<CloudinaryAsset | null>(null);
  const [error, setError] = useState('');

  // Fetch current popup
  const { data: popup, isLoading } = useQuery({
    queryKey: ['admin-popup', id],
    queryFn: () => adminGetPopup(id),
    enabled: !!id,
  });

  // Prepopulate state
  useEffect(() => {
    if (popup) {
      setName(popup.name || '');
      setTitle(popup.title || '');
      setDescription(popup.description || '');
      setCtaText(popup.ctaText || '');
      setCtaUrl(popup.ctaUrl || '');
      setTrigger(popup.trigger || 'on_load');
      setTriggerDelay(popup.triggerDelay ?? 3000);
      setCooldownHours(popup.cooldownHours ?? 24);
      setPriority(popup.priority ?? 0);
      setIsActive(popup.isActive ?? true);
      setShowOnPages(popup.showOnPages?.join(', ') || '');
      setLinkedEventId(popup.linkedEventId ? String(popup.linkedEventId) : '');
      setStartDate(popup.startDate ? new Date(popup.startDate).toISOString().slice(0, 16) : '');
      setEndDate(popup.endDate ? new Date(popup.endDate).toISOString().slice(0, 16) : '');
      setImage((popup.image as any) || null);
    }
  }, [popup]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<PopupCampaign>) => adminUpdatePopup(id, payload),
    onSuccess: () => router.push('/popups'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !title.trim()) {
      setError('Name and title are required.');
      return;
    }

    const payload: Partial<PopupCampaign> = {
      name: name.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      ctaText: ctaText.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
      trigger: trigger as any,
      triggerDelay: Number(triggerDelay),
      cooldownHours: Number(cooldownHours),
      priority: Number(priority),
      isActive,
      showOnPages: showOnPages ? showOnPages.split(',').map((p) => p.trim()).filter(Boolean) : undefined,
      linkedEventId: linkedEventId.trim() || undefined,
      startDate: startDate ? new Date(startDate).toISOString() as any : undefined,
      endDate: endDate ? new Date(endDate).toISOString() as any : undefined,
      image: image ?? undefined,
    };

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">Loading campaign details...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Edit Campaign</h1>
          <p className="text-text-muted text-sm mt-0.5">Modify campaign parameters</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Banner image */}
        <div className="glass rounded-2xl border border-border-subtle p-6">
          <CloudinaryUpload
            folder="popups"
            value={image}
            onChange={setImage}
            label="Campaign Banner Image (optional)"
            aspectRatio="aspect-video"
            id="popup-banner-image"
          />
        </div>

        {/* Basic configuration */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Campaign Setup</h2>
          <Field label="Campaign Name *">
            <input
              id="popup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Festival Early Bird Promotion"
              required
              className={inputCls}
            />
          </Field>
          <Field label="Popup Title *">
            <input
              id="popup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Get 20% Off Sunburn Passes!"
              required
              className={inputCls}
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              id="popup-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Offer description or details..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="CTA Button Text (optional)">
              <input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Claim Offer"
                className={inputCls}
              />
            </Field>
            <Field label="CTA Destination URL (optional)">
              <input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="e.g. https://mad.com/events/sunburn"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Trigger parameters */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Trigger & Constraints</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Trigger Type">
              <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className={inputCls}>
                <option value="on_load" className="bg-background-card">On Load</option>
                <option value="after_delay" className="bg-background-card">After Delay</option>
                <option value="on_exit" className="bg-background-card">Exit Intent</option>
                <option value="on_scroll" className="bg-background-card">Scroll Percentage</option>
              </select>
            </Field>
            <Field label="Trigger Delay (ms / percent value)">
              <input
                type="number"
                min="0"
                value={triggerDelay}
                onChange={(e) => setTriggerDelay(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cooldown Hours">
              <input
                type="number"
                min="1"
                value={cooldownHours}
                onChange={(e) => setCooldownHours(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Priority (higher = shown first)">
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Scope and Date targeting */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Scope & Targeting</h2>
          <Field label="Show on pages (comma-separated, blank for all)">
            <input
              value={showOnPages}
              onChange={(e) => setShowOnPages(e.target.value)}
              placeholder="e.g. /, /events, /venues"
              className={inputCls}
            />
          </Field>
          <Field label="Linked Event ID (optional)">
            <input
              value={linkedEventId}
              onChange={(e) => setLinkedEventId(e.target.value)}
              placeholder="e.g. 6a11621b76456c3977198702"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="End Date">
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              id="popup-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-accent-purple rounded"
            />
            <label htmlFor="popup-active" className="text-text-secondary text-sm">
              Mark this popup campaign as active immediately
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
            id="popup-submit"
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
