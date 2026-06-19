'use client';

import { AdminRole } from '@mad/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import ErrorState from '@/components/states/ErrorState';
import LoadingState from '@/components/states/LoadingState';
import { useAdminAuth } from '@/providers/AdminAuthProvider';

import { useUserDetail } from './_hooks/use-user-detail.hook';
import UserProfileCard from './_components/UserProfileCard';
import UserStatsSummary from './_components/UserStatsSummary';
import UserBookingsTable from './_components/UserBookingsTable';
import UserTicketsTable from './_components/UserTicketsTable';
import UserRefundsTable from './_components/UserRefundsTable';
import UserConfirmModal from './_components/UserConfirmModal';
import UserAlertBanner from './_components/UserAlertBanner';
import UserTabsHeader from './_components/UserTabsHeader';

export default function RegisteredUserDetailPage() {
  const { id } = useParams() as { id: string };
  const { admin } = useAdminAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'bookings' | 'tickets' | 'refunds'>('bookings');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'suspend' | 'reactivate' | null>(null);

  // Auto-dismiss success/error toast alerts
  useEffect(() => {
    const activeToast = successToast || errorToast;
    if (activeToast) {
      const setter = successToast ? setSuccessToast : setErrorToast;
      const timer = setTimeout(() => setter(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast, errorToast]);

  const {
    profile,
    bookings,
    allTickets,
    allRefunds,
    isLoading,
    error,
    toggleMutation,
  } = useUserDetail({
    id,
    onToggleSuccess: (active) => {
      setSuccessToast(`User account has been successfully ${active ? 'reactivated' : 'suspended'}`);
      setIsConfirmOpen(false);
    },
    onToggleError: (err) => {
      setErrorToast(err);
      setIsConfirmOpen(false);
    },
  });

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
          message={(error as Error)?.message || 'Customer profile not found.'}
          retry={() => router.push('/users')}
        />
      </div>
    );
  }

  const handleToggleClick = () => {
    setConfirmType(profile.isActive ? 'suspend' : 'reactivate');
    setIsConfirmOpen(true);
  };

  const isToggleAllowed = admin?.role === AdminRole.SUPER_ADMIN || admin?.role === AdminRole.ADMIN;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link href="/users" className="text-xs text-accent-purple hover:underline flex items-center gap-1">
          ← Back to Users
        </Link>
      </div>

      {/* Toast Alert Feedback */}
      <UserAlertBanner successToast={successToast} errorToast={errorToast} />

      {/* Main Profile Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UserProfileCard
          profile={profile}
          isToggleAllowed={isToggleAllowed}
          isPending={toggleMutation.isPending}
          onToggleClick={handleToggleClick}
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

      {/* Suspend / Reactivate Confirmation Modal Dialog */}
      <UserConfirmModal
        isOpen={isConfirmOpen}
        confirmType={confirmType}
        isPending={toggleMutation.isPending}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => toggleMutation.mutate()}
      />
    </div>
  );
}
