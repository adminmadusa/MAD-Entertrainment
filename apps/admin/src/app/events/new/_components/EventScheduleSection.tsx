'use client';

import React from 'react';
import { EventScheduleCard } from '@/components/events/EventScheduleCard';

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

export function EventScheduleSection(props: EventScheduleSectionProps) {
  return <EventScheduleCard {...props} />;
}
