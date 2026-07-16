import React from 'react';

import { type AdminCategory } from '@/lib/api/admin/category.service';
import { EVENT_CATEGORY_LABELS, EventStatus } from '@mad/shared';
import { FormField } from '@mad/ui';
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
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';


export interface EventBasicInfoCardProps {
  title: string;
  setTitle: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  status: EventStatus;
  setStatus: (val: EventStatus) => void;
  lifecycle?: string;
  venue: string;
  setVenue: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  dbCategories: AdminCategory[];
  statusOptions: EventStatus[];
}

export const EventBasicInfoCard = React.memo(function EventBasicInfoCard({
  title,
  setTitle,
  category,
  setCategory,
  status,
  setStatus,
  lifecycle,
  venue,
  setVenue,
  description,
  setDescription,
  dbCategories,
  statusOptions,
}: EventBasicInfoCardProps) {
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
      <FormField label="Event Title *" htmlFor="event-title">
        <input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sunburn Festival 2025"
          required
          className={inputCls}
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
        <EventVenueInput venue={venue} setVenue={setVenue} required />
      </div>
      <FormField label="Full Description *" htmlFor="event-description">
        <textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the event in detail..."
          required
          rows={5}
          className={`${inputCls} resize-none`}
        />
      </FormField>
    </div>
  );
});
