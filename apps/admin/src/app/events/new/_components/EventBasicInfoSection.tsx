'use client';

import React from 'react';
import { EVENT_CATEGORY_LABELS } from '@mad/shared';
import { FormField } from '@mad/ui';
import { inputCls } from './constants';

interface EventBasicInfoSectionProps {
  title: string;
  setTitle: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  organizerName: string;
  setOrganizerName: (val: string) => void;
  highlightsInput: string;
  setHighlightsInput: (val: string) => void;
  refundPolicy: string;
  setRefundPolicy: (val: string) => void;
  dbCategories: any[];
  venueField: React.ReactNode;
  publishField: React.ReactNode;
}

export function EventBasicInfoSection({
  title,
  setTitle,
  category,
  setCategory,
  description,
  setDescription,
  organizerName,
  setOrganizerName,
  highlightsInput,
  setHighlightsInput,
  refundPolicy,
  setRefundPolicy,
  dbCategories,
  venueField,
  publishField,
}: EventBasicInfoSectionProps) {
  return (
    <>
      {/* Basic Info */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">Basic Information</h2>
        <FormField label="Event Title" htmlFor="event-title" required>
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
          {publishField}
          {venueField}
        </div>
        <FormField label="Full Description" htmlFor="event-description" required>
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

      {/* Additional Details */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">Additional Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Organizer Name" htmlFor="event-organizer">
            <input
              id="event-organizer"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              placeholder="e.g. Ellen Colby, The MARM Farm"
              className={inputCls}
            />
          </FormField>
          <FormField label="Highlights (comma separated)" htmlFor="event-highlights">
            <input
              id="event-highlights"
              value={highlightsInput}
              onChange={(e) => setHighlightsInput(e.target.value)}
              placeholder="e.g. 12 hours, In person, Family friendly"
              className={inputCls}
            />
          </FormField>
        </div>
        <FormField label="Refund Policy" htmlFor="event-refund-policy">
          <textarea
            id="event-refund-policy"
            value={refundPolicy}
            onChange={(e) => setRefundPolicy(e.target.value)}
            placeholder="e.g. Refunds up to 7 days before event"
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </FormField>
      </div>
    </>
  );
}
