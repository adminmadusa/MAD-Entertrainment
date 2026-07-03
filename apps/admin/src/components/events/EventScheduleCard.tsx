import React from 'react';
import { FormField } from '@mad/ui';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

export interface EventScheduleCardProps {
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
}

export const EventScheduleCard = React.memo(function EventScheduleCard({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: EventScheduleCardProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
      <h2 className="text-white font-semibold">Schedule</h2>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start Date & Time *">
          <input
            id="event-start-date"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={inputCls}
          />
        </FormField>
        <FormField label="End Date & Time">
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
});
