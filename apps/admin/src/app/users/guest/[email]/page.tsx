'use client';

import { AdminRole } from '@mad/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';

import ErrorState from '@/components/states/ErrorState';
import LoadingState from '@/components/states/LoadingState';
import { useAdminAuth } from '@/providers/AdminAuthProvider';

import { useUserDetail } from '../../_hooks/use-user-detail.hook';
import UserProfileCard from '../../_components/UserProfileCard';
import UserStatsSummary from '../../_components/UserStatsSummary';
import UserBookingsTable from '../../_components/UserBookingsTable';
import UserTicketsTable from '../../_components/UserTicketsTable';
import UserRefundsTable from '../../_components/UserRefundsTable';
import UserTabsHeader from '../../_components/UserTabsHeader';

export default function GuestUserDetailPage() {
  const params = useParams() as { email: string };
  const email = decodeURIComponent(params.email);
  const { admin } = useAdminAuth();
  const router = useRouter();

  // Tab state: 'bookings' | 'tickets' | 'refunds'
  const [activeTab, setActiveTab] = useState<'bookings' | 'tickets' | 'refunds'>('bookings');

  // Fetch guest customer detail profile using centralized query/flattening hook
  const {
    profile,
    bookings,
    allTickets,
    allRefunds,
    isLoading,
    error,
  } = useUserDetail({ email });

  // Guard access permissions
  if (admin && admin.role === AdminRole.SCANNER) {
    return (
      <div className="py-12">
        <ErrorState message="Access Denied: You do not have permissions to view this resource." />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !profile || !bookings) {
    return (
      <div className="py-12">
        <ErrorState
          message={(error as Error)?.message || 'Guest customer profile not found.'}
          retry={() => router.push('/users')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link href="/users?type=guest" className="text-xs text-accent-purple hover:underline flex items-center gap-1">
          ← Back to Users
        </Link>
      </div>

      {/* Main Profile Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UserProfileCard
          profile={profile}
          isToggleAllowed={false}
          isPending={false}
          onToggleClick={() => {}}
        />
        <UserStatsSummary
          totalBookings={profile.totalBookings}
          totalTickets={profile.totalTickets}
          totalSpend={profile.totalSpend}
          lifetimeGrossSpend={profile.lifetimeGrossSpend}
          lifetimeRefunds={profile.lifetimeRefunds}
          lifetimeNetSpend={profile.lifetimeNetSpend}
        />
      </div>

      {/* Transaction Histories tabbed view */}
      <div className="space-y-4">
        <UserTabsHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          bookingsCount={bookings.length}
          ticketsCount={allTickets.length}
          refundsCount={allRefunds.length}
        />

        {/* Tab Panels */}
        {activeTab === 'bookings' && <UserBookingsTable bookings={bookings} />}
        {activeTab === 'tickets' && <UserTicketsTable tickets={allTickets} />}
        {activeTab === 'refunds' && <UserRefundsTable refunds={allRefunds} />}
      </div>
    </div>
  );
}
