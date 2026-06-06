'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { BookingStatus, getBookingStatusLabel } from '@mad/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';

import { adminGetEvents } from '@/lib/api/admin/event.service';
import { adminScanTicket, adminLookupTickets, ScanResponse, LookupResponse } from '@/lib/api/admin/scanner.service';
import { extractApiError } from '@/lib/api/client';

const BOOKING_STATUS_COLORS: Record<string, string> = {
  [BookingStatus.CONFIRMED]: 'border-green-500/50 text-green-400 bg-green-500/10',
  [BookingStatus.PENDING]: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  [BookingStatus.AWAITING_PAYMENT]: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  [BookingStatus.EXPIRING]: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
  [BookingStatus.FAILED]: 'border-red-500/50 text-red-400 bg-red-500/10',
  [BookingStatus.CANCELLED]: 'border-red-500/50 text-red-400 bg-red-500/10',
  [BookingStatus.REFUNDED]: 'border-purple-500/50 text-purple-300 bg-purple-500/10',
  [BookingStatus.EXPIRED]: 'border-slate-500/50 text-slate-300 bg-slate-500/10',
};

export default function ScannerPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [ticketId, setTicketId] = useState('');
  const [lastScanResult, setLastScanResult] = useState<ScanResponse | { ticketId: string; admits: string | number; tierName: string } | null>(null);
  const [lastScanError, setLastScanError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isBulkCheckingIn, setIsBulkCheckingIn] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);

  const handleCheckInAll = async (unscannedTickets: any[]) => {
    setIsBulkCheckingIn(true);
    setBulkSummary(null);
    let successCount = 0;
    const failures: string[] = [];

    for (const ticket of unscannedTickets) {
      try {
        await scanMutation.mutateAsync(ticket.ticketId);
        successCount++;
      } catch (err: any) {
        const apiErr = extractApiError(err);
        failures.push(`${ticket.ticketId} (${apiErr.message || 'Verification failed'})`);
      }
    }

    setIsBulkCheckingIn(false);
    if (failures.length === 0) {
      setBulkSummary(`Successfully checked in all ${successCount} tickets!`);
    } else {
      setBulkSummary(
        `Bulk check-in completed. ${successCount} checked in successfully. ${failures.length} failed: ${failures.join(', ')}`
      );
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch active events for selection
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events', { status: 'published' }],
    queryFn: () => adminGetEvents({ limit: 100 }), // Simplified fetch
  });

  const events = eventsRes?.items || [];

  // Auto-focus input when event is selected
  useEffect(() => {
    if (selectedEventId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedEventId, lastScanResult, lastScanError, lookupResult, lookupError]);

  const scanMutation = useMutation({
    mutationFn: (tid: string) => adminScanTicket(tid, selectedEventId),
    onSuccess: (data) => {
      setLastScanResult(data);
      setLastScanError(null);
      // Immediately patch the lookup result so the Check-In button disables
      setLookupResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tickets: prev.tickets.map((t) =>
            t.ticketId === data.ticketId
              ? { ...t, scannedAt: data.scannedAt }
              : t
          ),
        };
      });
      setTicketId('');
    },
    onError: (err, scannedTicketId) => {
      const apiErr = extractApiError(err);
      setLastScanError(apiErr.message);
      setLastScanResult(null);
      // Removed setTicketId('') to preserve failed inputs

      // Immediately patch the lookup result if the ticket has already been checked in
      if (apiErr.message && apiErr.message.includes('Ticket already used')) {
        const details = apiErr.details as { scannedAt?: string } | undefined;
        const scannedAt = details?.scannedAt || new Date().toISOString();

        setLookupResult((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tickets: prev.tickets.map((t) =>
              t.ticketId === scannedTicketId
                ? { ...t, scannedAt }
                : t
            ),
          };
        });
      }
    },
  });

  const lookupMutation = useMutation({
    mutationFn: (ref: string) => adminLookupTickets(ref, selectedEventId),
    onSuccess: (data) => {
      setLookupResult(data);
      setLookupError(null);
      setLastScanResult(null);
      setLastScanError(null);
      setTicketId('');
    },
    onError: (err) => {
      setLookupError(extractApiError(err).message);
      setLookupResult(null);
      setLastScanResult(null);
      setLastScanError(null);
      // Keep input visible on error
    },
  });

  const [isOffline, setIsOffline] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineScans = useCallback(async () => {
    if (isOffline) return;
    const { getOfflineScans, clearOfflineScans } = await import('@/lib/offline-scanner.service');
    const pendingScans = await getOfflineScans();
    if (pendingScans.length === 0) return;

    for (const scan of pendingScans) {
      try {
        await adminScanTicket(scan.ticketId, scan.eventId);
      } catch {
        // Log or handle failed sync if necessary
      }
    }
    await clearOfflineScans(pendingScans.map(s => s.id));
    setOfflineCount(0);
    alert(`Successfully synced ${pendingScans.length} offline scans!`);
  }, [isOffline]);

  useEffect(() => {
    if (!isOffline) {
      syncOfflineScans();
    } else {
      import('@/lib/offline-scanner.service').then(({ getOfflineScans }) => {
        getOfflineScans().then(scans => setOfflineCount(scans.length));
      });
    }
  }, [isOffline, syncOfflineScans]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim() || !selectedEventId) return;

    let inputToProcess = ticketId.trim();

    // Attempt to parse JSON (backward compatibility for legacy QR payloads)
    try {
      const payload = JSON.parse(inputToProcess);
      if (payload && payload.ticketId) {
        inputToProcess = payload.ticketId;
      }
    } catch {
      // Not JSON, continue with normal string
    }

    if (isOffline) {
      const { saveOfflineScan } = await import('@/lib/offline-scanner.service');
      await saveOfflineScan(inputToProcess, selectedEventId);
      setOfflineCount(prev => prev + 1);
      setLastScanResult({ ticketId: inputToProcess, admits: 'OFFLINE MODE', tierName: 'SAVED LOCALLY' });
      setLastScanError(null);
      setTicketId('');
    } else {
      if (inputToProcess.startsWith('TKT-') || inputToProcess.match(/^[a-zA-Z0-9\-_]+$/)) {
        // Assume ticket ID if it starts with TKT- or is just a normal string that doesn't start with MAD-
        if (inputToProcess.startsWith('MAD-')) {
          lookupMutation.mutate(inputToProcess);
        } else {
          scanMutation.mutate(inputToProcess);
        }
      } else {
        scanMutation.mutate(inputToProcess);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ticket Scanner</h1>
          <p className="text-text-muted mt-1 text-sm">
            Select an event and scan QR codes to validate entry.
          </p>
        </div>
        {isOffline && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Offline Mode ({offlineCount} queued)
          </div>
        )}
      </div>

      {/* Configuration Box */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Target Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setLastScanResult(null);
              setLastScanError(null);
            }}
            className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-white text-sm focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
            disabled={isLoadingEvents}
          >
            <option value="">-- Select Event to Start Scanning --</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.title} ({new Date(ev.startDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {selectedEventId && (
          <form onSubmit={handleScanSubmit} className="pt-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">Scan Barcode / Ticket ID</label>
            <input
              ref={inputRef}
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="TKT-XXXX-XXX..."
              className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
              autoFocus
              autoComplete="off"
              disabled={scanMutation.isPending}
            />
            <p className="text-xs text-text-muted mt-2">
              Ensure input is focused when using a physical hardware scanner.
            </p>
          </form>
        )}
      </div>

      {/* Result Area */}
      <AnimatePresence mode="wait">
        {scanMutation.isPending && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-accent-purple/50 p-12 flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-10 h-10 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium animate-pulse">Verifying Ticket...</p>
          </motion.div>
        )}

        {lastScanResult && !scanMutation.isPending && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-emerald-500/50 p-8 flex flex-col items-center justify-center text-center space-y-4 bg-emerald-500/5"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">VALID TICKET</h2>
              <p className="text-text-secondary mt-1 font-mono text-sm">{lastScanResult.ticketId}</p>
            </div>
            
            <div className="mt-4 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-emerald-400 font-bold text-lg">
                ADMIT: {lastScanResult.admits} {typeof lastScanResult.admits === 'number' && lastScanResult.admits > 1 ? 'PEOPLE' : 'PERSON'}
              </p>
              <p className="text-text-muted text-xs uppercase mt-1 tracking-wider">{lastScanResult.tierName}</p>
            </div>
          </motion.div>
        )}

        {lastScanError && !scanMutation.isPending && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-red-500/50 p-8 flex flex-col items-center justify-center text-center space-y-4 bg-red-500/5"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <div>
              <h2 className="text-3xl font-black text-red-400">INVALID SCANNED</h2>
              <p className="text-text-secondary mt-2 text-sm">{lastScanError}</p>
            </div>
          </motion.div>
        )}

        {lookupMutation.isPending && (
          <motion.div
            key="loading-lookup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-accent-purple/50 p-12 flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-10 h-10 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium animate-pulse">Looking up reference...</p>
          </motion.div>
        )}

        {lookupError && !lookupMutation.isPending && (
          <motion.div
            key="error-lookup"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-red-500/50 p-8 flex flex-col items-center justify-center text-center space-y-4 bg-red-500/5"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <div>
              <h2 className="text-3xl font-black text-red-400">LOOKUP FAILED</h2>
              <p className="text-text-secondary mt-2 text-sm">{lookupError}</p>
            </div>
          </motion.div>
        )}

        {lookupResult && !lookupMutation.isPending && (
          <motion.div
            key="success-lookup"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-border-subtle p-6 space-y-4 text-left w-full"
          >
            {lookupResult.booking && (
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">Booking: {lookupResult.booking.bookingId}</h3>
                <p className="text-sm text-text-secondary">Guest: {lookupResult.booking.guestName || 'N/A'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    BOOKING_STATUS_COLORS[lookupResult.booking.status] ?? 'border-slate-500/50 text-slate-300 bg-slate-500/10'
                  }`}>
                    {getBookingStatusLabel(lookupResult.booking.status)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Tickets ({lookupResult.tickets.length})</h4>
              {(() => {
                const unscannedTickets = lookupResult.tickets.filter((t) => !t.scannedAt);
                return unscannedTickets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCheckInAll(unscannedTickets)}
                    disabled={isBulkCheckingIn || scanMutation.isPending}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-accent-purple/20 border border-accent-purple/40 hover:bg-accent-purple/35 rounded-lg text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isBulkCheckingIn ? 'Checking In...' : 'Check In All Remaining'}
                  </button>
                );
              })()}
            </div>

            {bulkSummary && (
              <div className={`p-4 rounded-xl text-sm border font-medium ${bulkSummary.includes('failed') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                {bulkSummary}
              </div>
            )}
            
            <div className="space-y-3">
              {lookupResult.tickets.map((t) => (
                <div key={t.ticketId} className="bg-background border border-border-subtle rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-white">{t.ticketId}</p>
                    <p className="text-xs text-text-secondary mt-1">{t.tierName} • Admits: {t.admits}</p>
                    {t.scannedAt && (
                      <p className="text-xs text-amber-400 mt-1">Checked In at {new Date(t.scannedAt).toLocaleTimeString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => scanMutation.mutate(t.ticketId)}
                    disabled={!!t.scannedAt || scanMutation.isPending || isBulkCheckingIn}
                    className="btn-primary text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check In
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
