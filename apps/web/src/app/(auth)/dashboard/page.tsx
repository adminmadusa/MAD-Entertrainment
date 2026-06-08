'use client';

import { QUERY_KEYS } from '@mad/shared';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { BookingHeaderCard } from '@/components/booking/shared/BookingHeaderCard';
import { publicGetMyBookings } from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';

function ProfileCardSkeleton() {
  return (
    <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/10" />
        <div className="space-y-2 flex-grow">
          <div className="w-1/3 h-5 bg-white/15 rounded" />
          <div className="w-1/2 h-3.5 bg-white/10 rounded" />
        </div>
      </div>
      <div className="border-t border-border-subtle/30 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="w-20 h-2.5 bg-white/5 rounded" />
          <div className="w-40 h-4 bg-white/10 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="w-20 h-2.5 bg-white/5 rounded" />
          <div className="w-40 h-4 bg-white/10 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="w-20 h-2.5 bg-white/5 rounded" />
          <div className="w-40 h-4 bg-white/10 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="w-20 h-2.5 bg-white/5 rounded" />
          <div className="w-40 h-4 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border-subtle/30">
        <div className="space-y-2">
          <div className="w-24 h-2.5 bg-white/5 rounded" />
          <div className="w-48 h-6 bg-white/15 rounded" />
          <div className="w-32 h-3.5 bg-white/10 rounded" />
        </div>
        <div className="w-20 h-7 bg-white/10 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
        <div className="space-y-1.5">
          <div className="w-16 h-2.5 bg-white/5 rounded" />
          <div className="w-24 h-4 bg-white/10 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="w-16 h-2.5 bg-white/5 rounded" />
          <div className="w-24 h-4 bg-white/10 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="w-16 h-2.5 bg-white/5 rounded" />
          <div className="w-24 h-4 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const router = useRouter();
  const bookingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const scrollToBookings = () => {
    bookingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const {
    data: bookingsData,
    isLoading: isBookingsLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.mine(),
    queryFn: publicGetMyBookings,
    enabled: isAuthenticated,
    retry: false,
  });



  const showSkeleton = isAuthLoading || !isAuthenticated;
  const userName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account User';
  const userPhone = user?.mobileNumber || user?.phone || 'Not Provided';
  const userEmail = user?.email || 'N/A';

  const renderBookingsContent = () => {
    if (isBookingsLoading) {
      return (
        <div className="space-y-4">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      );
    }

    if (error) {
      return (
        <div className="glass rounded-3xl border border-error/30 bg-error/5 p-8 text-center space-y-4">
          <div className="text-2xl">⚠️</div>
          <h4 className="text-red-400 font-bold">Failed to load bookings</h4>
          <p className="text-text-secondary text-xs max-w-sm mx-auto">
            We encountered an issue retrieving your booking records. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all"
          >
            Retry
          </button>
        </div>
      );
    }

    if (bookingsData?.bookings && bookingsData.bookings.length > 0) {
      return (
        <div className="space-y-4">
          {bookingsData.bookings.map((booking) => (
            <Link
              href={`/bookings/${booking.bookingId}`}
              key={booking._id || booking.bookingId}
              className="block transition-all duration-300 hover:scale-[1.01]"
            >
              <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl transition-all duration-300 hover:border-white/15 hover:shadow-glow-purple/10">
                <BookingHeaderCard booking={booking} />
                <div className="pt-4 border-t border-border-subtle/30 flex justify-between items-center text-xs">
                  <span className="text-accent-purple-light font-bold hover:underline">
                    View Tickets &amp; Actions →
                  </span>
                  <span className="text-text-muted">
                    {booking.totalTickets} Ticket(s)
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      );
    }

    return (
      <div className="glass rounded-3xl border border-border-subtle p-12 text-center space-y-4">
        <div className="text-4xl">🎟️</div>
        <h4 className="text-white font-bold text-base">No bookings found</h4>
        <p className="text-text-secondary text-xs max-w-sm mx-auto leading-relaxed">
          You don't have any bookings yet. Once you book tickets for events, they will appear here automatically.
        </p>
        <div className="pt-2">
          <Link
            href="/events"
            className="px-6 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md inline-block"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-3xl relative z-10 px-4 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-display-sm font-black text-white tracking-tight">
            Welcome, {userName}
          </h1>
        </div>

        {showSkeleton ? (
          <div className="space-y-8">
            <ProfileCardSkeleton />
            <div className="space-y-4">
              <div className="w-28 h-4 bg-white/10 rounded animate-pulse" />
              <BookingCardSkeleton />
              <BookingCardSkeleton />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link 
                href="/tickets" 
                className="glass p-5 rounded-2xl text-center hover:bg-white/5 border border-white/5 hover:border-accent-purple/30 hover:shadow-glow-sm/10 transition-all group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🎫</div>
                <div className="font-bold text-white text-sm">My Tickets</div>
                <div className="text-text-muted text-[10px] mt-1">View active passes</div>
              </Link>
              <button 
                onClick={scrollToBookings} 
                className="glass p-5 rounded-2xl text-center hover:bg-white/5 border border-white/5 hover:border-accent-purple/30 hover:shadow-glow-sm/10 transition-all group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📅</div>
                <div className="font-bold text-white text-sm">My Bookings</div>
                <div className="text-text-muted text-[10px] mt-1">Manage reservations</div>
              </button>
              <Link 
                href="/events" 
                className="glass p-5 rounded-2xl text-center hover:bg-white/5 border border-white/5 hover:border-accent-purple/30 hover:shadow-glow-sm/10 transition-all group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
                <div className="font-bold text-white text-sm">Book Event</div>
                <div className="text-text-muted text-[10px] mt-1">Find live events</div>
              </Link>
              <Link 
                href="/support" 
                className="glass p-5 rounded-2xl text-center hover:bg-white/5 border border-white/5 hover:border-accent-purple/30 hover:shadow-glow-sm/10 transition-all group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">❓</div>
                <div className="font-bold text-white text-sm">Help Center</div>
                <div className="text-text-muted text-[10px] mt-1">FAQ and support</div>
              </Link>
            </div>

            {/* Profile Card / Account Details */}
            <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-4">
                {user?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={userName}
                    className="w-16 h-16 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white text-2xl font-black shadow-glow-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-white font-bold text-xl">Account Details</h2>
                  <p className="text-text-secondary text-xs mt-1">Manage your profile and linked contact details</p>
                </div>
              </div>

              <div className="border-t border-border-subtle/30 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block">Email Address</span>
                  <span className="text-white font-semibold">{userEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block">Phone Number</span>
                  <span className="text-white font-semibold">{userPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block">Member Since</span>
                  <span className="text-text-muted font-semibold italic">Coming Soon</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block">Account Type</span>
                  <span className="text-white font-semibold capitalize">{user?.isGuest ? 'Guest Account' : 'Registered Member'}</span>
                </div>
              </div>
            </div>

            {/* Bookings Section */}
            <div ref={bookingsRef} className="space-y-4">
              <h3 className="text-white font-bold text-lg">My Bookings</h3>
              {renderBookingsContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
