import React from 'react';
import { FormField, Input } from '@mad/ui';

export interface EventVenueInputProps {
  venue: string;
  setVenue: (val: string) => void;
  required?: boolean;
}

export const EventVenueInput = React.memo(function EventVenueInput({
  venue,
  setVenue,
  required = true,
}: EventVenueInputProps) {
  return (
    <FormField label={required ? 'Venue *' : 'Venue'} htmlFor="event-venue">
      <Input
        id="event-venue"
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        placeholder="Enter venue name"
        required={required}
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
});
