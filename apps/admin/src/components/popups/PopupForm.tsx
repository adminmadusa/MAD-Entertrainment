'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CloudinaryUpload } from '@/components/CloudinaryUpload';
import type { PopupCampaign } from '@mad/types';
import { FormField, Input, Textarea } from '@mad/ui';

import {
  defaultPopupForm,
  inputCls,
  mapPopupToFormState,
  PopupFormState,
  POPUP_PAGE_OPTIONS,
} from './popup-form.utils';

interface PopupFormProps {
  initialData?: PopupCampaign | null;
  onSubmit: (state: PopupFormState) => void;
  isPending: boolean;
  apiError?: string | null;
}

export function PopupForm({
  initialData,
  onSubmit,
  isPending,
  apiError,
}: PopupFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<PopupFormState>(defaultPopupForm());
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormState(mapPopupToFormState(initialData));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formState.name.trim() || !formState.title.trim()) {
      setValidationError('Name and title are required.');
      return;
    }

    onSubmit(formState);
  };

  const displayedError = validationError || apiError;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {displayedError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          aria-live="polite"
          role="alert"
          className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
        >
          {displayedError}
        </motion.div>
      )}

      {/* Banner image */}
      <div className="glass rounded-2xl border border-border-subtle p-6">
        <CloudinaryUpload
          folder="popups"
          value={formState.image as any}
          onChange={(img) => setFormState((p) => ({ ...p, image: img }))}
          label="Campaign Banner Image (optional)"
          aspectRatio="aspect-video"
          id="popup-banner-image"
        />
      </div>

      {/* Basic configuration */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">Campaign Setup</h2>
        <FormField label="Campaign Name *">
          <Input
            id="popup-name"
            value={formState.name}
            onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Summer Festival Early Bird Promotion"
            required
          />
        </FormField>
        <FormField label="Popup Title *">
          <Input
            id="popup-title"
            value={formState.title}
            onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Get 20% Off Sunburn Passes!"
            required
          />
        </FormField>
        <FormField label="Description (optional)">
          <Textarea
            id="popup-description"
            value={formState.description}
            onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
            placeholder="Offer description or details..."
            rows={3}
            className="resize-none"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="CTA Button Text (optional)">
            <Input
              value={formState.ctaText}
              onChange={(e) => setFormState((p) => ({ ...p, ctaText: e.target.value }))}
              placeholder="e.g. Claim Offer"
            />
          </FormField>
          <FormField label="CTA Destination URL (optional)">
            <Input
              value={formState.ctaUrl}
              onChange={(e) => setFormState((p) => ({ ...p, ctaUrl: e.target.value }))}
              placeholder="e.g. https://mad.com/events/sunburn"
            />
          </FormField>
        </div>
      </div>

      {/* Trigger parameters */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">Trigger & Constraints</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Trigger Type" htmlFor="trigger-type">
            <select
              id="trigger-type"
              value={formState.trigger}
              onChange={(e) => setFormState((p) => ({ ...p, trigger: e.target.value }))}
              className={inputCls}
              aria-invalid={!!displayedError ? 'true' : undefined}
            >
              <option value="on_load" className="bg-background-card">On Load</option>
              <option value="after_delay" className="bg-background-card">After Delay</option>
              <option value="on_exit" className="bg-background-card">Exit Intent</option>
              <option value="on_scroll" className="bg-background-card">Scroll Percentage</option>
            </select>
          </FormField>
          <FormField label="Trigger Delay (ms / percent value)">
            <Input
              type="number"
              min="0"
              value={formState.triggerDelay}
              onChange={(e) => setFormState((p) => ({ ...p, triggerDelay: Number(e.target.value) }))}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cooldown Hours">
            <Input
              type="number"
              min="1"
              value={formState.cooldownHours}
              onChange={(e) => setFormState((p) => ({ ...p, cooldownHours: Number(e.target.value) }))}
            />
          </FormField>
          <FormField label="Priority (higher = shown first)">
            <Input
              type="number"
              value={formState.priority}
              onChange={(e) => setFormState((p) => ({ ...p, priority: Number(e.target.value) }))}
            />
          </FormField>
        </div>
      </div>

      {/* Scope and Date targeting */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">Scope & Targeting</h2>

        {/* Target pages — multi-checkbox, predefined marketing routes */}
        <div>
          <p className="text-sm text-text-secondary mb-3">
            Target Pages
            <span className="ml-1 text-text-muted">(select where this popup may appear)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {POPUP_PAGE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 cursor-pointer select-none p-2.5 rounded-xl border border-border-subtle hover:border-accent-purple/40 hover:bg-white/2 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formState.showOnPages.includes(opt.value)}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      showOnPages: e.target.checked
                        ? [...p.showOnPages, opt.value]
                        : p.showOnPages.filter((v) => v !== opt.value),
                    }))
                  }
                  className="w-4 h-4 accent-accent-purple rounded flex-shrink-0"
                />
                <span className="text-sm text-text-primary">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Warning when no pages selected */}
          {formState.showOnPages.length === 0 && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-amber-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              No pages selected. This popup will not appear to any users until at least one page is chosen.
            </p>
          )}
        </div>
        <FormField label="Linked Event ID (optional)">
          <Input
            value={formState.linkedEventId}
            onChange={(e) => setFormState((p) => ({ ...p, linkedEventId: e.target.value }))}
            placeholder="e.g. 6a11621b76456c3977198702"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date">
            <Input
              type="datetime-local"
              value={formState.startDate}
              onChange={(e) => setFormState((p) => ({ ...p, startDate: e.target.value }))}
            />
          </FormField>
          <FormField label="End Date">
            <Input
              type="datetime-local"
              value={formState.endDate}
              onChange={(e) => setFormState((p) => ({ ...p, endDate: e.target.value }))}
            />
          </FormField>
        </div>
        <div className="flex items-center gap-3 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            id="popup-active"
            checked={formState.isActive}
            onChange={(e) => setFormState((p) => ({ ...p, isActive: e.target.checked }))}
            className="w-4 h-4 accent-accent-purple rounded"
          />
          <label htmlFor="popup-active" className="text-text-secondary text-sm cursor-pointer">
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
          disabled={isPending}
          className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
        >
          {isPending ? 'Saving...' : initialData ? 'Save Changes' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
