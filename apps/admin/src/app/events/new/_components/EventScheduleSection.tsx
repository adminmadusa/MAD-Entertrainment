'use client';

import React from 'react';
import { EventScheduleCard } from '@/components/events/EventScheduleCard';

interface EventScheduleSectionProps {
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  bookingStartDate: string;
  setBookingStartDate: (val: string) => void;
  bookingEndDate: string;
  setBookingEndDate: (val: string) => void;
}

export function EventScheduleSection(props: EventScheduleSectionProps) {
  return <EventScheduleCard {...props} />;
}
