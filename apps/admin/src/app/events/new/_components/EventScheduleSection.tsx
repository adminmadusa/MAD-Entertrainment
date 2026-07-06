'use client';

import React from 'react';
import { FormField } from '@mad/ui';
import { inputCls } from './constants';

interface EventScheduleSectionProps {
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
}

export function EventScheduleSection({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: EventScheduleSectionProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
      <h2 className="text-white font-semibold">Schedule</h2>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start Date & Time" htmlFor="event-start-date" required>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </FormField>
        <FormField label="End Date & Time" htmlFor="event-end-date">
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls}
          />
        </FormField>
      </div>
    </div>
  );
}
