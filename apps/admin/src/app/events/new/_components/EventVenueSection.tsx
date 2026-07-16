'use client';

import React from 'react';
import { EventVenueInput } from '@/components/events/EventVenueInput';

interface EventVenueSectionProps {
  venueName: string;
  setVenueName: (val: string) => void;
}

export function EventVenueSection({
  venueName,
  setVenueName,
}: EventVenueSectionProps) {
  return (
    <EventVenueInput
      venue={venueName}
      setVenue={setVenueName}
      required={false} // Match the original "Venue" (not Venue *) label
    />
  );
}
