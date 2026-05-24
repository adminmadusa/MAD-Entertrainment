'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { publicGetMyBookings } from '@/lib/api/public.service';
import { useAuth } from '@/providers/auth.provider';

export default function UserDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: publicGetMyBookings,
    enabled: isAuthenticated,
  });

  const bookings = data?.bookings || [];

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-accent-purple border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-purple/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container-mad relative z-10 max-w-4xl space-y-8">
        {/* Profile Header */}
        <div className="glass-strong rounded-3xl border border-border-subtle p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent-purple to-accent-purple-light flex items-center justify-center text-2xl font-black shadow-glow-sm">
              {user?.name?.[0]?.toUpperCase() || '👤'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{user?.name || 'Guest User'}</h1>
              <p className="text-text-muted text-sm">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 glass border border-border-subtle rounded-xl text-sm font-semibold text-text-secondary hover:text-white transition-all hover:bg-white/5"
          >
            Sign Out
          </button>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-white px-2">My Bookings</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 glass rounded-2xl border border-border-subtle animate-pulse" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="glass rounded-3xl border border-border-subtle p-12 text-center">
              <div className="text-4xl mb-4 opacity-50">🎫</div>
              <h3 className="text-lg font-bold text-white mb-2">No Bookings Yet</h3>
              <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">
                You haven't booked any events yet. Explore our upcoming events to secure your tickets!
              </p>
              <Link href="/events" className="btn-gradient px-6 py-3 rounded-xl font-bold text-sm shadow-glow-sm">
                Explore Events
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookings.map((booking: any) => (
                <motion.div
                  key={booking._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl border border-border-subtle p-6 hover:border-accent-purple/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white/80">
                        {booking.bookingId}
                      </div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${
                        booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                        booking.status === 'awaiting_payment' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                      {booking.eventId?.title || 'Unknown Event'}
                    </h3>
                    <p className="text-text-muted text-xs mb-4">
                      {new Date(booking.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })} • {booking.totalTickets} Tickets
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border-subtle flex justify-between items-center">
                    <span className="text-white font-bold">₹{booking.totalAmount}</span>
                    <Link
                      href={`/my-booking?ref=${booking.bookingId}`}
                      className="text-xs text-accent-purple-light hover:text-white transition-colors font-semibold"
                    >
                      View Details →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
