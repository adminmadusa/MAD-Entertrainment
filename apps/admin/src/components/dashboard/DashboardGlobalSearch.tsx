'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { BOOKING_REFERENCE_REGEX } from '@mad/shared';

export function DashboardGlobalSearch() {
  const router = useRouter();
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchError, setGlobalSearchError] = useState('');

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalSearchError('');
    const query = globalSearchQuery.trim();
    if (!query) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const refRegex = new RegExp(BOOKING_REFERENCE_REGEX.source, 'i');

    if (emailRegex.test(query)) {
      router.push(`/bookings?search=${encodeURIComponent(query)}`);
    } else if (refRegex.test(query)) {
      const normalizedRef = query.toUpperCase();
      router.push(`/bookings?search=${encodeURIComponent(normalizedRef)}`);
    } else {
      setGlobalSearchError('Please enter a valid Booking Reference (MAD-YYYY-XXXXX) or Customer Email.');
    }
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
      <div>
        <h2 className="text-white font-semibold">Global Operational Search</h2>
        <p className="text-text-secondary text-xs mt-0.5">Locate customer bookings instantly by email or reference number</p>
      </div>

      <form onSubmit={handleGlobalSearch} className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              if (globalSearchError) setGlobalSearchError('');
            }}
            placeholder="e.g. MAD-2026-XXXXX or customer@gmail.com"
            className="flex-1 px-4 py-3 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-accent-purple hover:bg-accent-purple-light text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
          >
            Search Booking
          </button>
        </div>
        {globalSearchError && (
          <p className="text-red-400 text-xs mt-1 animate-pulse">{globalSearchError}</p>
        )}
      </form>
    </div>
  );
}
