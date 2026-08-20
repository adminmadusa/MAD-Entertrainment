'use client';

import Link from 'next/link';
import React from 'react';

import type { UserListItem } from '@/lib/api/admin/user.service';

interface UsersMobileCardsProps {
  items: UserListItem[];
  isLoading: boolean;
  searchParam: string;
}

export function UsersMobileCards({
  items,
  isLoading,
  searchParam,
}: UsersMobileCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass p-4 rounded-xl space-y-3 animate-pulse">
            <div className="h-4 bg-white/5 rounded w-1/2" />
            <div className="h-3 bg-white/5 rounded w-3/4" />
            <div className="h-3 bg-white/5 rounded w-1/3" />
            <div className="h-8 bg-white/5 rounded w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass p-8 rounded-xl text-center text-text-muted text-sm">
        {searchParam ? 'No customers match your search criteria.' : 'No customer records found.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((user) => (
        <div key={user.email} className="glass p-4 rounded-xl border border-border-subtle/50 space-y-2.5">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-white font-semibold text-sm">{user.name}</h4>
              <p className="text-text-muted text-xs font-mono">{user.email}</p>
            </div>
            {user.accountType === 'registered' ? (
              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${
                user.isActive
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                {user.isActive ? 'Active' : 'Suspended'}
              </span>
            ) : (
              <span className="text-[9px] px-2 py-0.5 rounded-full border font-medium bg-white/5 text-text-muted border-white/10">
                Guest
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1.5 text-xs text-text-secondary border-t border-white/5">
            <div>
              <span className="text-[10px] text-text-muted block">Phone</span>
              <span className="font-mono">{user.phone}</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Login Via</span>
              <span className="capitalize">{user.loginVia || 'Guest Checkout'}</span>
            </div>
          </div>

          <Link
            href={
              user.accountType === 'registered'
                ? `/users/${user.id}`
                : `/users/guest/${encodeURIComponent(user.email)}`
            }
            className="block w-full py-2 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-lg text-center text-xs font-semibold text-white transition-all mt-2"
          >
            View Profile
          </Link>
        </div>
      ))}
    </div>
  );
}
