'use client';

import { QUERY_KEYS, SeatStatus, STORAGE_VERSION } from '@mad/shared';
import { SeatLayout } from '@mad/types';
import { Button } from '@mad/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

import { extractApiError } from '@/lib/api/client';
import {
  publicGetEventBySlug,
  publicGetEventSeatLayout,
  publicCreateBooking,
} from '@/lib/api/public.service';
import { invalidatePublicBookingFlow } from '@/lib/query/query-invalidation.service';
import { useSocket } from '@/providers/socket.provider';


export default function PublicEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  const { socket } = useSocket();
  const [sessionId, setSessionId] = useState('');

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // General Admission quantities selection
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Seat map state
  const [dbLayout, setDbLayout] = useState<SeatLayout | null>(null);
  const [liveSeatStatus, setLiveSeatStatus] = useState<Record<string, { status: SeatStatus; lockedBy?: string }>>({});
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  // Setup unique Session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
      let sess = sessionStorage.getItem(sessionKey);
      if (!sess) {
        sess = 'sess_' + Math.random().toString(36).substring(2, 15);
        sessionStorage.removeItem('mad_checkout_session');
        sessionStorage.setItem(sessionKey, sess);
      }
      setSessionId(sess);
    }
  }, []);

  // 1. Fetch Event
  const { data: event, isLoading: isLoadingEvent } = useQuery({
    queryKey: QUERY_KEYS.public.events.detail(slug),
    queryFn: () => publicGetEventBySlug(slug),
    enabled: !!slug,
  });

  const eventId = event?._id;

  // 2. Fetch Seat Layout if seat-based
  const { data: seatLayout, isLoading: isLoadingLayout } = useQuery({
    queryKey: QUERY_KEYS.public.events.seats(eventId),
    queryFn: () => publicGetEventSeatLayout(eventId!),
    enabled: !!eventId && event?.bookingMode === 'seat_based',
  });

  // Keep track of layout in local state
  useEffect(() => {
    if (seatLayout) {
      setDbLayout(seatLayout);
      const initialStatuses: Record<string, { status: SeatStatus; lockedBy?: string }> = {};
      seatLayout.seats.forEach((seat) => {
        initialStatuses[seat.seatId] = {
          status: seat.status,
          lockedBy: seat.lockedBy,
        };
      });
      setLiveSeatStatus(initialStatuses);
      // Reset selected seats on layout reload
      setSelectedSeatIds([]);
    }
  }, [seatLayout]);

  // 3. WebSockets integration
  useEffect(() => {
    if (!socket || !eventId || !sessionId) return;

    // Join room
    socket.emit('event:join', { eventId });

    // Listen to real-time locks
    const handleSeatLocked = ({ seatIds, sessionId: lockHolderSessionId }: { seatIds: string[]; sessionId: string }) => {
      setLiveSeatStatus((prev) => {
        const next = { ...prev };
        seatIds.forEach((seatId) => {
          next[seatId] = { status: SeatStatus.LOCKED, lockedBy: lockHolderSessionId };
        });
        return next;
      });
    };

    const handleSeatReserved = ({ seatIds }: { seatIds: string[]; bookingId?: string }) => {
      setLiveSeatStatus((prev) => {
        const next = { ...prev };
        seatIds.forEach((seatId) => {
          next[seatId] = { status: SeatStatus.LOCKED };
        });
        return next;
      });
    };

    const handleSeatBooked = ({ seatIds }: { seatIds: string[]; bookingId?: string }) => {
      setLiveSeatStatus((prev) => {
        const next = { ...prev };
        seatIds.forEach((seatId) => {
          next[seatId] = { status: SeatStatus.BOOKED };
        });
        return next;
      });
      setSelectedSeatIds((prev) => prev.filter((seatId) => !seatIds.includes(seatId)));
    };

    const handleSeatUnlocked = ({ seatIds }: { seatIds: string[] }) => {
      setLiveSeatStatus((prev) => {
        const next = { ...prev };
        seatIds.forEach((seatId) => {
          if (next[seatId]?.status === SeatStatus.LOCKED) {
            next[seatId] = { status: SeatStatus.AVAILABLE };
          }
        });
        return next;
      });
    };

    // Listen to lock confirmation for this connection
    const handleSeatLockStatus = ({ success, seatIds, message }: { success: boolean; seatIds: string[]; message?: string }) => {
      if (success) {
        setSelectedSeatIds((prev) => {
          const next = [...prev];
          seatIds.forEach((id) => {
            if (!next.includes(id)) next.push(id);
          });
          return next;
        });
        setLiveSeatStatus((prev) => {
          const next = { ...prev };
          seatIds.forEach((id) => {
            next[id] = { status: SeatStatus.LOCKED, lockedBy: sessionId };
          });
          return next;
        });
      } else {
        alert(message || 'Failed to lock seats. They may have been reserved by another user.');
      }
    };

    const handleSeatUnlockStatus = ({ success, seatIds }: { success: boolean; seatIds: string[] }) => {
      if (success) {
        setSelectedSeatIds((prev) => prev.filter((id) => !seatIds.includes(id)));
        setLiveSeatStatus((prev) => {
          const next = { ...prev };
          seatIds.forEach((id) => {
            if (next[id]?.lockedBy === sessionId) {
              next[id] = { status: SeatStatus.AVAILABLE };
            }
          });
          return next;
        });
      }
    };

    socket.on('seat:locked', handleSeatLocked);
    socket.on('seat:reserved', handleSeatReserved);
    socket.on('seat:booked', handleSeatBooked);
    socket.on('seat:unlocked', handleSeatUnlocked);
    socket.on('seat:lock:status', handleSeatLockStatus);
    socket.on('seat:unlock:status', handleSeatUnlockStatus);

    return () => {
      socket.emit('event:leave', { eventId });
      socket.off('seat:locked', handleSeatLocked);
      socket.off('seat:reserved', handleSeatReserved);
      socket.off('seat:booked', handleSeatBooked);
      socket.off('seat:unlocked', handleSeatUnlocked);
      socket.off('seat:lock:status', handleSeatLockStatus);
      socket.off('seat:unlock:status', handleSeatUnlockStatus);
    };
  }, [socket, eventId, sessionId]);

  // Booking Mutation
  const createBookingMutation = useMutation({
    mutationFn: (payload: any) => publicCreateBooking(payload, sessionId),
    onSuccess: async (booking) => {
      await invalidatePublicBookingFlow(queryClient, {
        bookingId: booking._id,
        bookingRef: booking.bookingId,
        eventId,
        eventSlug: slug,
      });
      router.push(`/checkout/${booking._id}`);
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.errors && Object.keys(apiErr.errors).length > 0) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(apiErr.errors)) {
          mapped[key] = msgs[0];
        }
        setFieldErrors(mapped);
        const firstErrorId = Object.keys(mapped)[0];
        setTimeout(() => {
          const el = document.getElementById(firstErrorId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
          }
        }, 100);
      } else {
        setFormError(apiErr.message);
      }
    },
  });

  const handleSeatClick = (seatId: string) => {
    if (!socket || !eventId || !sessionId) return;

    const seatState = liveSeatStatus[seatId];
    const isCurrentlySelected = selectedSeatIds.includes(seatId);

    if (isCurrentlySelected) {
      // Unlock seat
      socket.emit('seat:unlock', { eventId, seatIds: [seatId], sessionId });
    } else {
      if (seatState && seatState.status !== SeatStatus.AVAILABLE) {
        return; // Cannot select occupied seats
      }
      if (selectedSeatIds.length >= 10) {
        alert('You can book a maximum of 10 seats at a time.');
        return;
      }
      // Lock seat
      socket.emit('seat:lock', { eventId, seatIds: [seatId], sessionId });
    }
  };

  const handleQtyChange = (tier: string, change: number) => {
    setQuantities((prev) => {
      const val = (prev[tier] || 0) + change;
      return {
        ...prev,
        [tier]: Math.max(0, Math.min(10, val)),
      };
    });
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const newErrors: Record<string, string> = {};
    if (!guestName.trim()) newErrors.guestName = 'Name is required';
    if (!guestEmail.trim()) newErrors.guestEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) newErrors.guestEmail = 'Invalid email format';
    
    if (!guestPhone.trim()) newErrors.guestPhone = 'Phone is required';

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      const firstErrorId = Object.keys(newErrors)[0];
      setTimeout(() => {
        const el = document.getElementById(firstErrorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 100);
      return;
    }

    if (!eventId) return;

    let ticketsPayload: any[] = [];

    if (event.bookingMode === 'seat_based') {
      if (selectedSeatIds.length === 0) {
        setFormError('Please select at least one seat from the seat layout.');
        return;
      }

      // Group selected seats by tier
      const seatsByTier: Record<string, any[]> = {};
      selectedSeatIds.forEach((id) => {
        const seat = dbLayout?.seats.find((s) => s.seatId === id);
        if (seat) {
          if (!seatsByTier[seat.tier]) seatsByTier[seat.tier] = [];
          seatsByTier[seat.tier].push(seat);
        }
      });

      ticketsPayload = Object.entries(seatsByTier).map(([tier, seats]) => ({
        tier,
        quantity: seats.length,
        seats: seats.map((s) => ({
          seatId: s.seatId,
          row: s.row,
          number: s.number,
          section: s.section,
        })),
      }));
    } else {
      ticketsPayload = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([tier, qty]) => ({
          tier,
          quantity: qty,
        }));

      if (ticketsPayload.length === 0) {
        setFormError('Please select at least 1 ticket.');
        return;
      }
    }

    createBookingMutation.mutate({
      eventId,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      guestPhone: guestPhone.trim(),
      tickets: ticketsPayload,
      couponCode: couponCode.trim() || undefined,
    });
  };

  // Group layout seats by Row
  const seatsByRow = useMemo(() => {
    if (!dbLayout) return {};
    const rows: Record<string, typeof dbLayout.seats> = {};
    dbLayout.seats.forEach((seat) => {
      if (!rows[seat.row]) rows[seat.row] = [];
      rows[seat.row].push(seat);
    });
    // Sort columns
    Object.keys(rows).forEach((rowKey) => {
      rows[rowKey].sort((a, b) => a.number - b.number);
    });
    return rows;
  }, [dbLayout]);

  if (isLoadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-white/40 animate-pulse text-sm">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-muted text-sm">Event not found.</div>
      </div>
    );
  }

  const showDateTime = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background">
      <div className="container-mad grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Event Details & Seat Selector */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Info */}
          <div className="glass rounded-3xl border border-border-subtle p-6 space-y-4">
            <div className="aspect-[21/9] w-full rounded-2xl overflow-hidden bg-white/5 relative">
              {event.bannerImage?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.bannerImage.url} alt={event.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-display-sm font-black text-white">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1">📅 {showDateTime}</span>
                <span className="flex items-center gap-1">⏰ Doors: {event.doorsOpenTime || 'TBA'} · Show: {event.showTime}</span>
                {event.venueId && (
                  <span className="flex items-center gap-1">📍 {(event.venueId as any).name}, {(event.venueId as any).city}</span>
                )}
              </div>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed pt-2 border-t border-border-subtle/50">
              {event.description}
            </p>
          </div>

          {/* Ticket Booking Area */}
          <div className="glass rounded-3xl border border-border-subtle p-6 space-y-6">
            <h2 className="text-white font-bold text-lg">Select Tickets</h2>

            {event.bookingMode === 'seat_based' ? (
              // ─── Seat Map Layout ───
              <div className="space-y-6">
                <div className="text-center bg-white/2 border border-white/5 rounded-2xl py-2 text-[10px] text-text-muted tracking-widest uppercase">
                  🎬 STAGE THIS WAY
                </div>

                {isLoadingLayout ? (
                  <div className="text-center py-12 text-text-muted text-xs animate-pulse">
                    Loading interactive seat layout...
                  </div>
                ) : (
                  <div className="overflow-x-auto pb-4 custom-scrollbar flex justify-center">
                    <div className="inline-block space-y-2 min-w-[450px]">
                      {Object.entries(seatsByRow).map(([rowLabel, rowSeats]) => (
                        <div key={rowLabel} className="flex items-center gap-2">
                          {/* Row Indicator */}
                          <div className="w-6 text-xs text-text-muted font-bold text-center">
                            {rowLabel}
                          </div>
                          {/* Seats */}
                          <div className="flex gap-1.5">
                            {rowSeats.map((seat) => {
                              const liveState = liveSeatStatus[seat.seatId] || { status: seat.status };
                              const isSelected = selectedSeatIds.includes(seat.seatId);
                              const isLockedByOthers = liveState.status === 'locked' && liveState.lockedBy !== sessionId;
                              const isOccupied = liveState.status === 'booked' || liveState.status === 'blocked' || isLockedByOthers;

                              let bgCls = 'bg-white/10 hover:bg-white/20 border-white/10 text-white';
                              if (seat.tier === 'vip' || seat.tier === 'vvip') {
                                bgCls = 'bg-accent-purple/20 hover:bg-accent-purple/40 border-accent-purple/30 text-accent-purple-light';
                              } else if (seat.tier === 'gold') {
                                bgCls = 'bg-amber-500/20 hover:bg-amber-500/40 border-amber-500/30 text-amber-300';
                              } else if (seat.tier === 'silver') {
                                bgCls = 'bg-slate-400/20 hover:bg-slate-400/40 border-slate-400/30 text-slate-300';
                              }

                              if (isSelected) {
                                bgCls = 'bg-accent-cyan border-accent-cyan text-black font-black scale-105';
                              } else if (isOccupied) {
                                bgCls = 'bg-red-500/10 border-red-500/20 text-red-500/30 cursor-not-allowed opacity-40';
                              }

                              return (
                                <button
                                  type="button"
                                  key={seat.seatId}
                                  disabled={isOccupied}
                                  onClick={() => handleSeatClick(seat.seatId)}
                                  className={`w-7 h-7 text-[10px] rounded-lg border font-bold flex items-center justify-center transition-all ${bgCls}`}
                                  title={`${seat.seatId} - Tier: ${seat.tier} - ₹${seat.price}`}
                                >
                                  {seat.number}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seat Map Legend */}
                <div className="flex flex-wrap justify-center gap-6 text-xs text-text-muted pt-4 border-t border-border-subtle/50">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-white/15 border border-white/20" /> Available
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-accent-cyan border border-accent-cyan" /> Selected
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500/10 border border-red-500/20 opacity-40" /> Occupied
                  </div>
                </div>
              </div>
            ) : (
              // ─── General Admission Selectors ───
              <div className="space-y-4">
                {event.ticketTiers.map((tier) => (
                  <div
                    key={tier.tier}
                    className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-white font-bold">{tier.name}</div>
                        {tier.groupSize && tier.groupSize > 1 && (
                          <div className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">
                            Admits {tier.groupSize}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">{tier.description || 'General Access Ticket'}</div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-accent-purple-light font-black text-sm">
                          ₹{Math.max(0, tier.price - (tier.discount || 0))}
                        </div>
                        {tier.discount && tier.discount > 0 && (
                          <div className="text-xs text-text-muted line-through">₹{tier.price}</div>
                        )}
                      </div>
                      
                      {tier.availabilityWindow?.endDate && new Date() < new Date(tier.availabilityWindow.endDate) && (
                        <div className="text-[10px] text-accent-cyan mt-1">
                          Available until {new Date(tier.availabilityWindow.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 bg-background border border-border-subtle rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(tier.tier, -1)}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-white"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-white">
                        {quantities[tier.tier] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(tier.tier, 1)}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Guest Info Checkout Summary */}
        <div className="lg:col-span-4 glass rounded-3xl border border-border-subtle p-6 space-y-6">
          <h2 className="text-white font-bold text-lg">Checkout Details</h2>

          <form onSubmit={handleCheckoutSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Full Name *</label>
              <input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Jane Doe"
                required
                aria-invalid={!!fieldErrors.guestName}
                className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-text-primary focus:outline-none transition-colors ${
                  fieldErrors.guestName ? 'border-red-500 focus:border-red-500' : 'border-border-subtle focus:border-accent-purple'
                }`}
              />
              {fieldErrors.guestName && (
                <div className="text-red-400 text-xs mt-1">{fieldErrors.guestName}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Email Address *</label>
              <input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="jane@example.com"
                required
                aria-invalid={!!fieldErrors.guestEmail}
                className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-text-primary focus:outline-none transition-colors ${
                  fieldErrors.guestEmail ? 'border-red-500 focus:border-red-500' : 'border-border-subtle focus:border-accent-purple'
                }`}
              />
              {fieldErrors.guestEmail && (
                <div className="text-red-400 text-xs mt-1">{fieldErrors.guestEmail}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Phone Number *</label>
              <input
                id="guestPhone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+91 9876543210"
                required
                aria-invalid={!!fieldErrors.guestPhone}
                className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm text-text-primary focus:outline-none transition-colors ${
                  fieldErrors.guestPhone ? 'border-red-500 focus:border-red-500' : 'border-border-subtle focus:border-accent-purple'
                }`}
              />
              {fieldErrors.guestPhone && (
                <div className="text-red-400 text-xs mt-1">{fieldErrors.guestPhone}</div>
              )}
            </div>

            <div className="space-y-1 pt-3 border-t border-border-subtle/40">
              <label className="text-xs text-text-secondary font-medium">Promo Coupon (Optional)</label>
              <input
                id="couponCode"
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="PROMOCODE"
                aria-invalid={!!fieldErrors.couponCode}
                className={`w-full px-4 py-2.5 rounded-xl bg-background border font-mono uppercase text-sm text-text-primary focus:outline-none transition-colors ${
                  fieldErrors.couponCode ? 'border-red-500 focus:border-red-500' : 'border-border-subtle focus:border-accent-purple'
                }`}
              />
              {fieldErrors.couponCode && (
                <div className="text-red-400 text-xs mt-1">{fieldErrors.couponCode}</div>
              )}
            </div>

            <div className="mt-4">
              <Button
                id="checkout-proceed-btn"
                type="submit"
                variant="primary"
                fullWidth
                isLoading={createBookingMutation.isPending}
              >
                Proceed to Checkout
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
