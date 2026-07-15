'use client';

import React from 'react';

import { FormField, Input } from '@mad/ui';
import { TicketSalesCloseMode } from '@mad/shared';

const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

interface EventScheduleSectionProps {
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  ticketSalesCloseMode: string;
  setTicketSalesCloseMode: (val: string) => void;
  ticketSalesCloseDate: string;
  setTicketSalesCloseDate: (val: string) => void;
}

export function EventScheduleSection({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  ticketSalesCloseMode,
  setTicketSalesCloseMode,
  ticketSalesCloseDate,
  setTicketSalesCloseDate,
}: EventScheduleSectionProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
      <h2 className="text-white font-semibold">Schedule</h2>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start Date & Time" htmlFor="event-start-date" required>
          <Input
            id="event-start-date"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </FormField>
        <FormField label="End Date & Time" htmlFor="event-end-date">
          <Input
            id="event-end-date"
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </FormField>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle/50 mt-4">
        <FormField label="Ticket Sales Close Policy" htmlFor="ticket-sales-close-mode" required>
          <select
            id="ticket-sales-close-mode"
            value={ticketSalesCloseMode}
            onChange={(e) => setTicketSalesCloseMode(e.target.value)}
            className={inputCls}
          >
            <option value={TicketSalesCloseMode.EVENT_START}>Event Start Date</option>
            <option value={TicketSalesCloseMode.EVENT_END}>Event End Date</option>
            <option value={TicketSalesCloseMode.CUSTOM_DATE}>Custom Date & Time</option>
          </select>
        </FormField>
        
        {ticketSalesCloseMode === TicketSalesCloseMode.CUSTOM_DATE && (
          <FormField label="Sales Close Date & Time" htmlFor="ticket-sales-close-date" required>
            <Input
              id="ticket-sales-close-date"
              type="datetime-local"
              value={ticketSalesCloseDate}
              onChange={(e) => setTicketSalesCloseDate(e.target.value)}
            />
          </FormField>
        )}
      </div>
    </div>
  );
}
