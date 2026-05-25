'use client';

import { EventCategory } from '@mad/shared';
import { Coupon } from '@mad/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { adminGetCoupon, adminUpdateCoupon } from '@/lib/api/admin/coupon.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';


const CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.MAD_EVENT]: 'MAD Event',
  [EventCategory.DJ_NIGHT]: 'DJ Night',
  [EventCategory.CONCERT]: 'Concert',
  [EventCategory.FESTIVAL]: 'Festival',
  [EventCategory.COMEDY]: 'Comedy Show',
  [EventCategory.CELEBRITY]: 'Celebrity Event',
  [EventCategory.THEATRE]: 'Theatre',
  [EventCategory.CINEMA]: 'Cinema',
  [EventCategory.VIP_EVENT]: 'VIP Event',
  [EventCategory.LIVE_SHOW]: 'Live Show',
};

const toLocalDatetimeString = (dateStr: Date | string | undefined) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<string>('');
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Targeting: Events and Categories
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);

  const [error, setError] = useState('');

  // Fetch current coupon details
  const { data: coupon, isLoading: isLoadingCoupon } = useQuery({
    queryKey: ['admin-coupon', id],
    queryFn: () => adminGetCoupon(id),
    enabled: !!id,
  });

  // Fetch events list
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  // Prepopulate form fields
  useEffect(() => {
    if (coupon) {
      setCode(coupon.code || '');
      setDescription(coupon.description || '');
      setDiscountType(coupon.discountType || 'percentage');
      setDiscountValue(coupon.discountValue || 0);
      setMaxDiscount(coupon.maxDiscount !== undefined && coupon.maxDiscount !== null ? String(coupon.maxDiscount) : '');
      setMinOrderAmount(coupon.minOrderAmount || 0);
      setUsageLimit(coupon.usageLimit || 100);
      setValidFrom(toLocalDatetimeString(coupon.validFrom));
      setValidUntil(toLocalDatetimeString(coupon.validUntil));
      setIsActive(coupon.isActive ?? true);
      setSelectedEvents(coupon.applicableEventIds || []);
      setSelectedCategories(coupon.applicableCategories || []);
    }
  }, [coupon]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Coupon>) => adminUpdateCoupon(id, payload),
    onSuccess: () => router.push('/coupons'),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Coupon code is required.');
      return;
    }

    if (discountType === 'percentage' && discountValue > 100) {
      setError('Percentage discount cannot exceed 100%.');
      return;
    }

    if (!validFrom || !validUntil) {
      setError('Both validity start and end dates are required.');
      return;
    }

    if (new Date(validUntil) < new Date(validFrom)) {
      setError('End date must be after or equal to start date.');
      return;
    }

    const payload: Partial<Coupon> = {
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null as any,
      minOrderAmount: Number(minOrderAmount),
      usageLimit: Number(usageLimit),
      validFrom: new Date(validFrom).toISOString(),
      validUntil: new Date(validUntil).toISOString(),
      isActive,
      applicableEventIds: selectedEvents.length > 0 ? selectedEvents : [],
      applicableCategories: selectedCategories.length > 0 ? selectedCategories : [],
    };

    updateMutation.mutate(payload);
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const toggleCategorySelection = (cat: EventCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  if (isLoadingCoupon) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">Loading coupon details...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Edit Coupon</h1>
          <p className="text-text-muted text-sm mt-0.5">Modify parameters for coupon {code}</p>
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

        {/* Basic Configuration */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">General Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Coupon Code *">
              <input
                id="coupon-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SUMMER50"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple font-mono uppercase transition-colors"
              />
            </Field>
            <Field label="Discount Type">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className={inputCls}
              >
                <option value="percentage" className="bg-background-card">Percentage (%)</option>
                <option value="fixed" className="bg-background-card">Fixed Amount (₹)</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={discountType === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (₹) *'}>
              <input
                type="number"
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Max Discount (₹, blank for unlimited)">
              <input
                type="number"
                min="0"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                disabled={discountType === 'fixed'}
                placeholder={discountType === 'fixed' ? 'N/A' : 'Unlimited'}
                className={`${inputCls} disabled:opacity-40`}
              />
            </Field>
          </div>

          <Field label="Description (optional)">
            <textarea
              id="coupon-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 15% discount up to ₹500 on all festival tickets"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        {/* Limits & Validity */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Rules & Validity</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Min Order Amount (₹)">
              <input
                type="number"
                min="0"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Usage Limit (Total times redeemable)">
              <input
                type="number"
                min="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(Number(e.target.value))}
                required
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valid From *">
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Valid Until *">
              <input
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
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
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategorySelection(cat)}
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
                  {(eventsData?.items ?? []).map((event) => {
                    const isSelected = selectedEvents.includes(event._id);
                    return (
                      <div
                        key={event._id}
                        onClick={() => toggleEventSelection(event._id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-accent-purple/10 text-white' : 'hover:bg-white/5 text-text-secondary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-3.5 h-3.5 accent-accent-purple rounded"
                        />
                        <span className="text-xs font-medium">{event.title}</span>
                      </div>
                    );
                  })}
                  {(eventsData?.items ?? []).length === 0 && (
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
              type="checkbox"
              id="coupon-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
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
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="coupon-submit"
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
