'use client';

import React from 'react';
import { FormField, Input } from '@mad/ui';

interface EventVenueSectionProps {
  venueName: string;
  setVenueName: (val: string) => void;
}

export function EventVenueSection({
  venueName,
  setVenueName,
}: EventVenueSectionProps) {
  return (
    <FormField label="Venue" htmlFor="event-venue" required>
      <Input
        id="event-venue"
        value={venueName}
        onChange={(e) => setVenueName(e.target.value)}
        placeholder="Enter venue name"
        required
        prefix={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 2c-4.418 0-8 1.79-8 4v3h16v-3c0-2.21-3.582-4-8-4z"
            />
          </svg>
        }
      />
    </FormField>
  );
}
