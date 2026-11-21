'use client';

import React from 'react';

export interface BookingMarketingPreferencesProps {
  keepUpdated?: boolean;
  sendBestEvents?: boolean;
}

export function BookingMarketingPreferences({
  keepUpdated,
  sendBestEvents,
}: BookingMarketingPreferencesProps) {
  return (
    <div className="border-t border-white/5 pt-3 space-y-1.5">
      <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Marketing Preferences</h4>
      <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-2.5">
        <span className="text-text-secondary">Keep updated about event updates</span>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
            keepUpdated
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-white/5 text-text-muted border border-white/10'
          }`}
        >
          {keepUpdated ? 'Yes' : 'No'}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-2.5">
        <span className="text-text-secondary">Receive details on best events</span>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
            sendBestEvents
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-white/5 text-text-muted border border-white/10'
          }`}
        >
          {sendBestEvents ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  );
}
