'use client';

import { AdminRole, BookingStatus, BOOKING_STATUS_META } from '@mad/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import ErrorState from '@/components/states/ErrorState';
import LoadingState from '@/components/states/LoadingState';
import { useAdminAuth } from '@/hooks/use-admin-auth.hook';
import { adminGetRegisteredDetail, adminToggleUserActive } from '@/lib/api/admin/user.service';
import { Modal } from '@mad/ui';

export default function RegisteredUserDetailPage() {
  const { id } = useParams() as { id: string };
  const { admin } = useAdminAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // Tab state: 'bookings' | 'tickets' | 'refunds'
  const [activeTab, setActiveTab] = useState<'bookings' | 'tickets' | 'refunds'>('bookings');

  // Client-side pagination states (default 10 items per page)
  const [bookingPage, setBookingPage] = useState(1);
  const [ticketPage, setTicketPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);
  const itemsPerPage = 10;

  // Copy feedback states
  const [emailCopied, setEmailCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  // Success / error toast banners
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Confirmation modal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'suspend' | 'reactivate' | null>(null);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  // ─── Fetch Details ───────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => adminGetRegisteredDetail(id),
    enabled: !!id,
  });

  // Toggle user status mutation
  const toggleMutation = useMutation({
    mutationFn: () => adminToggleUserActive(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccessToast(`User account has been successfully ${res.isActive ? 'reactivated' : 'suspended'}`);
      setIsConfirmOpen(false);
    },
    onError: (err: any) => {
      setErrorToast(err?.response?.data?.message || 'Failed to update account status.');
      setIsConfirmOpen(false);
    },
  });

  // ─── Guards ──────────────────────────────────────────────────
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

  if (error || !data) {
    return (
      <div className="py-12">
        <ErrorState
          message={(error as Error)?.message || 'Customer profile not found.'}
          retry={() => router.push('/users')}
        />
      </div>
    );
  }

  const { profile, bookings } = data;

  // Flatten tickets & refunds lists from bookings
  const allTickets = bookings.flatMap((b) =>
    b.tickets.map((t) => ({
      ...t,
      eventId: b.eventId,
      bookingId: b.bookingId,
      purchaseDate: b.purchaseDate,
    }))
  );

  const allRefunds = bookings.flatMap((b) =>
    b.refunds.map((r) => ({
      ...r,
      bookingId: b.bookingId,
    }))
  );

  // ─── Pagination Calculations ─────────────────────────────────
  const totalBookings = bookings.length;
  const totalBookingsPages = Math.ceil(totalBookings / itemsPerPage) || 1;
  const paginatedBookings = bookings.slice((bookingPage - 1) * itemsPerPage, bookingPage * itemsPerPage);

  const totalTickets = allTickets.length;
  const totalTicketsPages = Math.ceil(totalTickets / itemsPerPage) || 1;
  const paginatedTickets = allTickets.slice((ticketPage - 1) * itemsPerPage, ticketPage * itemsPerPage);

  const totalRefunds = allRefunds.length;
  const totalRefundsPages = Math.ceil(totalRefunds / itemsPerPage) || 1;
  const paginatedRefunds = allRefunds.slice((refundPage - 1) * itemsPerPage, refundPage * itemsPerPage);

  // Clipboard copies
  const handleCopy = (text: string, type: 'email' | 'phone') => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } else {
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    }
  };

  const handleToggleClick = () => {
    if (profile.isActive) {
      setConfirmType('suspend');
    } else {
      setConfirmType('reactivate');
    }
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
      {successToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-semibold shadow-glow-sm">
          {successToast}
        </div>
      )}
      {errorToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 font-semibold shadow-glow-sm">
          {errorToast}
        </div>
      )}

      {/* Main Profile Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass p-6 rounded-2xl border border-border-subtle/60 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-accent-purple tracking-wider">Registered Customer</span>
              <h2 className="text-white font-black text-xl mt-1">{profile.name}</h2>
              <p className="text-text-muted text-xs font-mono mt-0.5">ID: {profile.id}</p>
            </div>

            {/* Account Status controls */}
            <div className="flex items-center justify-between py-2 border-y border-white/5">
              <div>
                <p className="text-xs font-semibold text-text-primary">Account Status</p>
                <p className="text-[10px] text-text-muted">Registered via {profile.loginVia}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${
                  profile.isActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {profile.isActive ? 'Active' : 'Suspended'}
                </span>
                {isToggleAllowed && (
                  <button
                    onClick={handleToggleClick}
                    disabled={toggleMutation.isPending}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      profile.isActive
                        ? 'border-error/30 text-red-400 hover:bg-error/10'
                        : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                    }`}
                  >
                    {profile.isActive ? 'Suspend' : 'Reactivate'}
                  </button>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Email</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-text-secondary">{profile.email}</span>
                  <button
                    onClick={() => handleCopy(profile.email, 'email')}
                    className="p-1 hover:bg-white/5 rounded text-[10px] text-accent-purple"
                  >
                    {emailCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Mobile Number</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-text-secondary">{profile.phone}</span>
                  <button
                    onClick={() => handleCopy(profile.phone, 'phone')}
                    className="p-1 hover:bg-white/5 rounded text-[10px] text-accent-purple"
                    disabled={profile.phone === '—'}
                  >
                    {phoneCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Created Date</span>
                <span className="text-text-secondary">
                  {new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Last Login</span>
                <span className="text-text-secondary">
                  {profile.lastLogin
                    ? new Date(profile.lastLogin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Never logged in'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregated Totals Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl border border-border-subtle/50 flex flex-col justify-between">
            <span className="text-xs text-text-muted font-medium">Total Bookings</span>
            <div className="mt-4">
              <span className="text-3xl font-black text-white">{profile.totalBookings}</span>
              <p className="text-[10px] text-text-muted mt-1">Overall orders submitted</p>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border border-border-subtle/50 flex flex-col justify-between">
            <span className="text-xs text-text-muted font-medium">Total Tickets Admitted</span>
            <div className="mt-4">
              <span className="text-3xl font-black text-white">{profile.totalTickets}</span>
              <p className="text-[10px] text-text-muted mt-1">Confirmed valid entries</p>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border border-border-subtle/50 flex flex-col justify-between">
            <span className="text-xs text-text-muted font-medium">Total Spend</span>
            <div className="mt-4">
              <span className="text-3xl font-black text-white">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(profile.totalSpend)}
              </span>
              <p className="text-[10px] text-text-muted mt-1">Spend on confirmed tickets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Histories tabbed view */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border-subtle gap-4">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-2 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'bookings' ? 'border-accent-purple text-white' : 'border-transparent text-text-muted hover:text-white'
            }`}
          >
            Booking History ({totalBookings})
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-2 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'tickets' ? 'border-accent-purple text-white' : 'border-transparent text-text-muted hover:text-white'
            }`}
          >
            Tickets Logs ({totalTickets})
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`py-2 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'refunds' ? 'border-accent-purple text-white' : 'border-transparent text-text-muted hover:text-white'
            }`}
          >
            Refunds Logs ({totalRefunds})
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'bookings' && (
          <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-white/[0.01]">
                    <th className="text-left text-text-muted font-medium py-3 px-5">Booking ID</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Event</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Status</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Date</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Tickets</th>
                    <th className="text-right text-text-muted font-medium py-3 px-5">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-muted">No bookings registered.</td>
                    </tr>
                  ) : (
                    paginatedBookings.map((b) => (
                      <tr key={b._id} className="border-b border-border-subtle/30 hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-xs text-white">{b.bookingId}</td>
                        <td className="py-3.5 px-4 text-text-primary">
                          {b.eventId ? (
                            <div>
                              <p className="font-semibold text-xs">{b.eventId.title}</p>
                              <p className="text-[10px] text-text-muted mt-0.5">
                                {new Date(b.eventId.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-semibold capitalize border ${
                            b.status === BookingStatus.CONFIRMED
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {BOOKING_STATUS_META[b.status as BookingStatus]?.label || b.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary text-xs">
                          {new Date(b.purchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4 text-text-primary font-medium">{b.ticketCount}</td>
                        <td className="py-3.5 px-5 text-right font-semibold text-white">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: b.currency }).format(b.totalAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Client Bookings Pagination */}
            {totalBookingsPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-white/[0.01]">
                <p className="text-text-muted text-xs">Page {bookingPage} of {totalBookingsPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                    disabled={bookingPage === 1}
                    className="px-3 py-1 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setBookingPage((p) => Math.min(totalBookingsPages, p + 1))}
                    disabled={bookingPage === totalBookingsPages}
                    className="px-3 py-1 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-white/[0.01]">
                    <th className="text-left text-text-muted font-medium py-3 px-5">Ticket ID</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Event</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Tier</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Booking ID</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">QR Status</th>
                    <th className="text-right text-text-muted font-medium py-3 px-5">Scanned At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-muted">No tickets generated.</td>
                    </tr>
                  ) : (
                    paginatedTickets.map((t) => (
                      <tr key={t.ticketId} className="border-b border-border-subtle/30 hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-xs text-white">{t.ticketId}</td>
                        <td className="py-3.5 px-4 text-text-primary">
                          {t.eventId ? (
                            <div>
                              <p className="font-semibold text-xs">{t.eventId.title}</p>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary text-xs capitalize">{t.tierName} (x{t.admits})</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">{t.bookingId}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-semibold border ${
                            t.scannedAt ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                          }`}>
                            {t.scannedAt ? 'Redeemed' : 'Valid'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right text-text-secondary text-xs">
                          {t.scannedAt
                            ? new Date(t.scannedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Client Tickets Pagination */}
            {totalTicketsPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-white/[0.01]">
                <p className="text-text-muted text-xs">Page {ticketPage} of {totalTicketsPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTicketPage((p) => Math.max(1, p - 1))}
                    disabled={ticketPage === 1}
                    className="px-3 py-1 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setTicketPage((p) => Math.min(totalTicketsPages, p + 1))}
                    disabled={ticketPage === totalTicketsPages}
                    className="px-3 py-1 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'refunds' && (
          <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-white/[0.01]">
                    <th className="text-left text-text-muted font-medium py-3 px-5">Refund ID</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Booking ID</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Reason</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Status</th>
                    <th className="text-left text-text-muted font-medium py-3 px-4">Processed Date</th>
                    <th className="text-right text-text-muted font-medium py-3 px-5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRefunds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-muted">No refund logs registered.</td>
                    </tr>
                  ) : (
                    paginatedRefunds.map((r) => (
                      <tr key={r.refundId} className="border-b border-border-subtle/30 hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-xs text-white">{r.refundId}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">{r.bookingId}</td>
                        <td className="py-3.5 px-4 text-text-secondary text-xs italic">{r.reason || 'No reason specified'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-semibold border capitalize ${
                            r.status === 'completed'
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary text-xs">
                          {r.processedAt
                            ? new Date(r.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Pending'}
                        </td>
                        <td className="py-3.5 px-5 text-right font-semibold text-white">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: r.currency }).format(r.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Client Refunds Pagination */}
            {totalRefundsPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-white/[0.01]">
                <p className="text-text-muted text-xs">Page {refundPage} of {totalRefundsPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRefundPage((p) => Math.max(1, p - 1))}
                    disabled={refundPage === 1}
                    className="px-3 py-1 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setRefundPage((p) => Math.min(totalRefundsPages, p + 1))}
                    disabled={refundPage === totalRefundsPages}
                    className="px-3 py-1 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suspend / Reactivate Confirmation Modal Dialog */}
      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} size="sm">
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-bold text-lg">
              {confirmType === 'suspend' ? 'Suspend User?' : 'Reactivate User?'}
            </h3>
            <p className="text-text-muted text-xs mt-1">
              {confirmType === 'suspend'
                ? 'This user will no longer be able to log in, access their tickets, or complete new bookings.'
                : 'This user will regain immediate access to log in and review booking histories.'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsConfirmOpen(false)}
              className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-xs font-medium text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-glow-sm disabled:opacity-50 transition-all ${
                confirmType === 'suspend' ? 'bg-red-600 hover:bg-red-500' : 'bg-accent-purple hover:bg-accent-purple/80'
              }`}
            >
              {toggleMutation.isPending ? 'Processing...' : confirmType === 'suspend' ? 'Suspend' : 'Reactivate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
