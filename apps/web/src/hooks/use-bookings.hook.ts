'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { apiClient, extractApiError } from '@/lib/api/client';
import { publicGetMyBookings, publicResendTicketEmail } from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { BookingStatus, QUERY_KEYS, getBookingLifecycle, type BookingForLifecycle } from '@mad/shared';
import type { Booking } from '@mad/types';

export function useBookings() {
  const { isAuthenticated } = useAuth();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendCooldowns, setResendCooldowns] = useState<Record<string, number>>({});
  const [refetchIntervalTime, setRefetchIntervalTime] = useState<number | false>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [infoMsg, setInfoMsg] = useState<string>('');

  // 1. Booking retrieval (React Query)
  const {
    data: bookingsData,
    isLoading: isBookingsLoading,
    error: bookingsError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.mine(),
    queryFn: () => publicGetMyBookings(),
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: refetchIntervalTime,
  });

  const bookings = useMemo(() => bookingsData?.bookings || [], [bookingsData?.bookings]);
  const tickets = useMemo(() => bookingsData?.tickets || [], [bookingsData?.tickets]);
  const ticketsReadyMap = useMemo(() => bookingsData?.ticketsReadyMap || {}, [bookingsData?.ticketsReadyMap]);

  // 2. Smart polling for pending tickets
  useEffect(() => {
    const hasPending = bookings.some(
      (b) => b.status === BookingStatus.CONFIRMED && !ticketsReadyMap[b._id?.toString() ?? '']
    );
    setRefetchIntervalTime(hasPending ? 3000 : false);
  }, [bookings, ticketsReadyMap]);

  const cooldownsExistRef = useRef(false);
  cooldownsExistRef.current = Object.keys(resendCooldowns).length > 0;

  // 3. Cooldown timers
  useEffect(() => {
    const timer = setInterval(() => {
      if (!cooldownsExistRef.current) return;

      setResendCooldowns((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const k of Object.keys(next)) {
          if (next[k] > 0) {
            next[k] -= 1;
            changed = true;
          } else {
            delete next[k];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 4. Download and Resend Action Handlers
  const handleDownloadPDF = async (bookingId: string, sessionToken?: string) => {
    try {
      setErrorMsg('');
      setInfoMsg('');
      setDownloadingId(bookingId);

      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const { data } = await apiClient.post<{ data: { downloadToken: string } }>(
        `/bookings/${bookingId}/download-token`,
        {},
        { headers }
      );
      const token = data?.data?.downloadToken;
      if (!token) {
        throw new Error('Failed to generate download token');
      }

      const downloadUrl = `${apiClient.defaults.baseURL || ''}/bookings/${bookingId}/download?token=${token}`;
      window.open(downloadUrl, '_blank');
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to download ticket PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResendTickets = async (bookingId: string, sessionToken?: string) => {
    try {
      setErrorMsg('');
      setInfoMsg('');
      setResendingId(bookingId);

      const res = await publicResendTicketEmail(bookingId, sessionToken);
      setInfoMsg(res.message || 'Tickets resent successfully to your email.');
      setResendCooldowns((prev) => ({ ...prev, [bookingId]: 60 }));
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to resend tickets. Please try again.');
    } finally {
      setResendingId(null);
    }
  };

  // 5. Grouping/sorting logic
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => b.status !== BookingStatus.FAILED && b.status !== BookingStatus.EXPIRED);
  }, [bookings]);

  const { upcomingBookings, liveBookings, pastBookings, cancelledBookings, refundedBookings } = useMemo(() => {
    const upcoming: Booking[] = [];
    const live: Booking[] = [];
    const past: Booking[] = [];
    const cancelled: Booking[] = [];
    const refunded: Booking[] = [];

    filteredBookings.forEach((b) => {
      // Cast the populated eventInfo to BaseEventForLifecycle
      const lifecycle = getBookingLifecycle(b as unknown as BookingForLifecycle);
      if (lifecycle === 'upcoming') {
        upcoming.push(b);
      } else if (lifecycle === 'live') {
        live.push(b);
      } else if (lifecycle === 'past') {
        past.push(b);
      } else if (lifecycle === 'cancelled') {
        cancelled.push(b);
      } else if (lifecycle === 'refunded') {
        refunded.push(b);
      }
    });

    return {
      upcomingBookings: upcoming,
      liveBookings: live,
      pastBookings: past,
      cancelledBookings: cancelled,
      refundedBookings: refunded,
    };
  }, [filteredBookings]);

  return {
    bookings,
    tickets,
    ticketsReadyMap,
    isLoading: isBookingsLoading,
    isError: !!bookingsError,
    error: bookingsError,
    refetch,
    downloadingId,
    resendingId,
    resendCooldowns,
    errorMsg,
    infoMsg,
    setErrorMsg,
    setInfoMsg,
    handleDownloadPDF,
    handleResendTickets,
    upcomingBookings,
    liveBookings,
    pastBookings,
    cancelledBookings,
    refundedBookings,
  };
}
