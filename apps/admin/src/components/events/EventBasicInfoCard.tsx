import React from 'react';

import { type AdminCategory } from '@/lib/api/admin/category.service';
import { EVENT_CATEGORY_LABELS, EventStatus, getCountryConfig, COUNTRY_CONFIG } from '@mad/shared';
import { FormField, Input, Textarea } from '@mad/ui';

import { EventVenueInput } from './EventVenueInput';


const EVENT_STATUS_LABELS: Partial<Record<EventStatus, string>> = {
  [EventStatus.DRAFT]: 'Draft',
  [EventStatus.PUBLISHED]: 'Published',
  [EventStatus.POSTPONED]: 'Postponed',
  [EventStatus.COMPLETED]: 'Completed',
  [EventStatus.CANCELLED]: 'Cancelled',
  [EventStatus.ARCHIVED]: 'Archived',
};

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50 transition-colors';


export interface EventBasicInfoCardProps {
  title: string;
  setTitle: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  status?: EventStatus;
  setStatus?: (val: EventStatus) => void;
  lifecycle?: string;
  venue: string;
  setVenue: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  dbCategories: AdminCategory[];
  statusOptions?: EventStatus[];
  hideStatus?: boolean;
  countryCode: string;
  setCountryCode: (val: string) => void;
  convenienceFee: number | '';
  setConvenienceFee: (val: number | '') => void;
  taxPercentage?: number | '';
  setTaxPercentage?: (val: number | '') => void;
}

export const EventBasicInfoCard = React.memo(function EventBasicInfoCard({
  title,
  setTitle,
  category,
  setCategory,
  status = EventStatus.PUBLISHED,
  setStatus,
  lifecycle,
  venue,
  setVenue,
  description,
  setDescription,
  dbCategories,
  statusOptions = [],
  hideStatus = false,
  countryCode,
  setCountryCode,
  convenienceFee,
  setConvenienceFee,
  taxPercentage = '',
  setTaxPercentage,
}: EventBasicInfoCardProps) {
  const country = getCountryConfig(countryCode);
  const effectiveFeeText =
    convenienceFee !== ''
      ? `${country.symbol}${convenienceFee}`
      : `${country.symbol}${country.defaultConvenienceFee} (Default)`;
  const effectiveTaxText =
    taxPercentage !== ''
      ? `${taxPercentage}% (Custom)`
      : `${country.defaultTax}% (${country.taxLabel})`;

  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Basic Information</h2>
        {lifecycle && (
          <span className="text-xs px-2.5 py-1 rounded-full border font-medium uppercase bg-white/5 border-white/10 text-text-secondary">
            Lifecycle: <span className="text-white">{lifecycle}</span>
          </span>
        )}
      </div>
      <FormField label="Event Title" htmlFor="event-title" required>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sunburn Festival 2025"
          required
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Category" htmlFor="event-category">
          <select
            id="event-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {dbCategories.length > 0
              ? dbCategories.map((cat) => (
                  <option key={cat._id} value={cat.slug} className="bg-background-card">
                    {cat.name}
                  </option>
                ))
              : Object.entries(EVENT_CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val} className="bg-background-card">
                    {label}
                  </option>
                ))}
          </select>
        </FormField>
        {!hideStatus && setStatus && (
          <FormField label="Status" htmlFor="event-status">
            <select
              id="event-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className={inputCls}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option} className="bg-background-card">
                  {EVENT_STATUS_LABELS[option] ?? option}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <EventVenueInput venue={venue} setVenue={setVenue} required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-white/5 pt-4">
        <FormField label="Country Location" htmlFor="event-country">
          <select
            id="event-country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className={inputCls}
          >
            {Object.values(COUNTRY_CONFIG).map((c) => (
              <option key={c.countryCode} value={c.countryCode} className="bg-background-card">
                {c.countryName} {c.countryCode === 'US' ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label={`Convenience Fee (${country.currency})`}
          htmlFor="event-convenience-fee"
        >
          <Input
            id="event-convenience-fee"
            type="number"
            min="0"
            step="0.01"
            value={convenienceFee}
            onChange={(e) => setConvenienceFee(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={`Default: ${country.symbol}${country.defaultConvenienceFee}`}
          />
        </FormField>
        <FormField
          label={`Tax Rate (% ${country.taxLabel})`}
          htmlFor="event-tax-percentage"
        >
          <Input
            id="event-tax-percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxPercentage}
            disabled={!setTaxPercentage}
            onChange={(e) =>
              setTaxPercentage &&
              setTaxPercentage(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder={`Default: ${country.defaultTax}%`}
          />
        </FormField>
        <div className="space-y-1">
          <span className="text-text-secondary text-xs font-semibold block mb-1">
            Pricing Summary
          </span>
          <div className="p-2.5 bg-white/3 border border-white/5 rounded-xl text-xs space-y-0.5 text-text-muted">
            <p>
              Currency: <span className="text-white font-bold">{country.currency} ({country.symbol})</span>
            </p>
            <p>
              Fee: <span className="text-white font-bold">{effectiveFeeText}</span>
            </p>
            <p>
              Tax: <span className="text-white font-bold">{effectiveTaxText}</span>
            </p>
          </div>
        </div>
      </div>

      <FormField label="Full Description" htmlFor="event-description" required>
        <Textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the event in detail..."
          required
          rows={5}
          className="resize-none"
        />
      </FormField>
    </div>
  );
});
