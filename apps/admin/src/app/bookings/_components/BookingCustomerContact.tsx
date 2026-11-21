'use client';

import React from 'react';
import { Button } from '@mad/ui';

export interface BookingCustomerContactProps {
  email: string;
  isUserBooking: boolean;
  canMutateBookings: boolean;
  isConfirmed: boolean;
  isResending: boolean;
  onEditEmailClick: () => void;
  onResendTickets: () => void;
}

export function BookingCustomerContact({
  email,
  isUserBooking,
  canMutateBookings,
  isConfirmed,
  isResending,
  onEditEmailClick,
  onResendTickets,
}: BookingCustomerContactProps) {
  return (
    <div className="border-t border-white/5 pt-3 space-y-2.5">
      <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Customer Contact</h4>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/5 rounded-xl p-3.5">
        <div>
          <span className="text-text-muted text-[10px] uppercase tracking-wider block">Current Email</span>
          <span className="text-white font-semibold font-mono text-xs select-all">{email}</span>
        </div>
        {canMutateBookings && (
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditEmailClick}
              disabled={isUserBooking}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                isUserBooking ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent-purple/50'
              }`}
            >
              Edit Email
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResendTickets}
              disabled={!isConfirmed || isResending}
              isLoading={isResending}
              className="px-3 py-1.5 text-xs font-semibold bg-accent-purple/25 hover:bg-accent-purple/40 border-accent-purple/40 text-accent-purple hover:text-white"
            >
              Resend Tickets
            </Button>
          </div>
        )}
      </div>
      {isUserBooking && (
        <div className="px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-[11px] text-yellow-400 flex items-start gap-2">
          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Email changes are not permitted for authenticated bookings.</span>
        </div>
      )}
    </div>
  );
}
