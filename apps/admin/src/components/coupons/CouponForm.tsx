'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EventCategory } from '@mad/shared';
import type { Coupon } from '@mad/types';
import { Alert, FormField, Input, Textarea } from '@mad/ui';

import {
  CATEGORY_LABELS,
  CouponFormState,
  defaultCouponForm,
  inputCls,
  mapCouponToFormState,
  validateCouponForm,
} from './coupon-form.utils';

interface CouponFormProps {
  initialData?: Coupon | null;
  onSubmit: (state: CouponFormState) => void;
  isPending: boolean;
  apiError?: string | null;
  events: Array<{ _id: string; title: string }>;
  isLoadingEvents: boolean;
}

export function CouponForm({
  initialData,
  onSubmit,
  isPending,
  apiError,
  events,
  isLoadingEvents,
}: CouponFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<CouponFormState>(defaultCouponForm());
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) setFormState(mapCouponToFormState(initialData));
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const errorMsg = validateCouponForm(formState);
    if (errorMsg) return setValidationError(errorMsg);
    onSubmit(formState);
  };

  const toggleEventSelection = (eventId: string) => {
    setFormState(p => ({
      ...p,
      selectedEvents: p.selectedEvents.includes(eventId)
        ? p.selectedEvents.filter(id => id !== eventId)
        : [...p.selectedEvents, eventId]
    }));
  };

  const toggleCategorySelection = (cat: EventCategory) => {
    setFormState(p => ({
      ...p,
      selectedCategories: p.selectedCategories.includes(cat)
        ? p.selectedCategories.filter(c => c !== cat)
        : [...p.selectedCategories, cat]
    }));
  };

  const displayedError = validationError || apiError;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {displayedError && (
        <Alert variant="danger" className="animate-in fade-in duration-300">
          {displayedError}
        </Alert>
      )}

      {/* General Details */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">General Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Coupon Code *" htmlFor="coupon-code">
            <Input
              id="coupon-code" value={formState.code} required
              onChange={e => setFormState(p => ({ ...p, code: e.target.value }))}
              placeholder="e.g. SUMMER50"
              className="font-mono uppercase text-sm text-text-primary"
            />
          </FormField>
          <FormField label="Discount Type" htmlFor="discount-type">
            <select
              id="discount-type"
              value={formState.discountType}
              onChange={e => setFormState(p => ({ ...p, discountType: e.target.value as 'percentage' | 'fixed' }))}
              className={inputCls}
            >
              <option value="percentage" className="bg-background-card">Percentage (%)</option>
              <option value="fixed" className="bg-background-card">Fixed Amount (₹)</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={formState.discountType === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (₹) *'} htmlFor="discount-value">
            <Input
              id="discount-value"
              type="number" min="0" required
              max={formState.discountType === 'percentage' ? 100 : undefined}
              value={formState.discountValue}
              onChange={e => setFormState(p => ({ ...p, discountValue: Number(e.target.value) }))}
            />
          </FormField>
          <FormField label="Max Discount (₹, blank for unlimited)" htmlFor="max-discount">
            <Input
              id="max-discount"
              type="number" min="0"
              value={formState.maxDiscount}
              onChange={e => setFormState(p => ({ ...p, maxDiscount: e.target.value }))}
              disabled={formState.discountType === 'fixed'}
              placeholder={formState.discountType === 'fixed' ? 'N/A' : 'Unlimited'}
            />
          </FormField>
        </div>

        <FormField label="Description (optional)" htmlFor="coupon-description">
          <Textarea
            id="coupon-description" value={formState.description} rows={3}
            onChange={e => setFormState(p => ({ ...p, description: e.target.value }))}
            placeholder="e.g. 15% discount up to ₹500 on all festival tickets"
            className="resize-none"
          />
        </FormField>
      </div>

      {/* Rules & Validity */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">Rules & Validity</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Min Order Amount (₹)" htmlFor="min-order-amount">
            <Input
              id="min-order-amount"
              type="number" min="0" value={formState.minOrderAmount}
              onChange={e => setFormState(p => ({ ...p, minOrderAmount: Number(e.target.value) }))}
            />
          </FormField>
          <FormField label="Usage Limit (Total times redeemable)" htmlFor="usage-limit">
            <Input
              id="usage-limit"
              type="number" min="1" required value={formState.usageLimit}
              onChange={e => setFormState(p => ({ ...p, usageLimit: Number(e.target.value) }))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Valid From *" htmlFor="valid-from">
            <Input
              id="valid-from"
              type="datetime-local" required value={formState.validFrom}
              onChange={e => setFormState(p => ({ ...p, validFrom: e.target.value }))}
            />
          </FormField>
          <FormField label="Valid Until *" htmlFor="valid-until">
            <Input
              id="valid-until"
              type="datetime-local" required value={formState.validUntil}
              onChange={e => setFormState(p => ({ ...p, validUntil: e.target.value }))}
            />
          </FormField>
        </div>
      </div>

      {/* Scope Targeting */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold font-bold">Targeting Filters (Optional)</h2>
        <p className="text-text-muted text-xs -mt-3">Leave unselected to make the coupon applicable system-wide</p>

        <div className="space-y-4">
          <div>
            <label className="text-text-secondary text-sm font-semibold mb-2 block">Applicable Event Categories</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const cat = key as EventCategory;
                const isSelected = formState.selectedCategories.includes(cat);
                return (
                  <button
                    type="button" key={cat} onClick={() => toggleCategorySelection(cat)}
                    className={`px-3 py-2 text-xs rounded-xl border font-medium text-left transition-all ${
                      isSelected
                        ? 'bg-accent-purple/10 border-accent-purple text-white'
                        : 'bg-white/2 border-white/5 text-text-muted hover:border-white/10 hover:text-text-secondary'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-text-secondary text-sm font-semibold mb-2 block">Applicable Specific Events</label>
            {isLoadingEvents ? (
              <div className="text-xs text-text-muted animate-pulse">Loading events list...</div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-border-subtle bg-white/2 rounded-xl p-3 space-y-2 custom-scrollbar">
                {events.map((event) => {
                  const isSelected = formState.selectedEvents.includes(event._id);
                  return (
                    <div
                      key={event._id} onClick={() => toggleEventSelection(event._id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-accent-purple/10 text-white' : 'hover:bg-white/5 text-text-secondary'
                      }`}
                    >
                      <input
                        type="checkbox" checked={isSelected} readOnly
                        className="w-3.5 h-3.5 accent-accent-purple rounded"
                      />
                      <span className="text-xs font-medium">{event.title}</span>
                    </div>
                  );
                })}
                {events.length === 0 && (
                  <div className="text-xs text-text-muted text-center py-4">No events found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Activation */}
      <div className="glass rounded-2xl border border-border-subtle p-6">
        <div className="flex items-center gap-3 cursor-pointer select-none py-1">
          <input
            type="checkbox" id="coupon-active" checked={formState.isActive}
            onChange={e => setFormState(p => ({ ...p, isActive: e.target.checked }))}
            className="w-4 h-4 accent-accent-purple rounded"
          />
          <label htmlFor="coupon-active" className="text-text-secondary text-sm">
            Mark this coupon as active immediately
          </label>
        </div>
      </div>

      {/* Submit Actions */}
      <div className="flex gap-4 pb-6">
        <button
          type="button" onClick={() => router.back()}
          className="flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          id="coupon-submit" type="submit" disabled={isPending}
          className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
        >
          {isPending
            ? initialData ? 'Saving Changes...' : 'Creating...'
            : initialData ? 'Save Changes' : 'Create Coupon'}
        </button>
      </div>
    </form>
  );
}
