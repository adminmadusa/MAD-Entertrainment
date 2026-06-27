'use client';

import React from 'react';
import { Field, inputCls } from './Field';

interface EventVenueSectionProps {
  venueName: string;
  setVenueName: (val: string) => void;
}

export function EventVenueSection({
  venueName,
  setVenueName,
}: EventVenueSectionProps) {
  return (
    <Field label="Venue *">
      <div className="relative">
        <input
          id="event-venue"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
          placeholder="Enter venue name"
          required
          className={inputCls + " pl-10"}
        />
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
        </span>
      </div>
    </Field>
  );
}
