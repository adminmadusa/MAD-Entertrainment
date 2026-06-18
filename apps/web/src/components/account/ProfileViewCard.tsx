'use client';

import React from 'react';
import { Button } from '@mad/ui';
import { AuthUser } from '@/types/auth';

interface ProfileViewCardProps {
  user: AuthUser | null;
  onEditClick: () => void;
}

export function ProfileViewCard({ user, onEditClick }: ProfileViewCardProps) {
  const userName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account User';
  const userPhone = user?.mobileNumber || user?.phone || 'Not Provided';
  const userEmail = user?.email || 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt={userName}
              className="w-16 h-16 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white text-2xl font-black shadow-glow-sm select-none">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-white font-bold text-xl">Account Details</h2>
            <p className="text-text-secondary text-xs mt-1">Manage your account details and linked contact information</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Button
            type="button"
            onClick={onEditClick}
            variant="outline"
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl border border-white/10 text-white hover:bg-white/5 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px] min-w-[120px]"
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="border-t border-border-subtle/30 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">First Name</span>
          <span className="text-white font-semibold block">{user?.firstName || '—'}</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Last Name</span>
          <span className="text-white font-semibold block">{user?.lastName || '—'}</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Email Address</span>
          <span className="text-white font-semibold block">{userEmail}</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Phone Number</span>
          <span className="text-white font-semibold block">{userPhone}</span>
        </div>
      </div>
    </div>
  );
}
