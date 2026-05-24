'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

import { adminGetEvents } from '@/lib/api/admin/event.service';
import { adminScanTicket } from '@/lib/api/admin/scanner.service';
import { extractApiError } from '@/lib/api/client';

export default function ScannerPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [ticketId, setTicketId] = useState('');
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [lastScanError, setLastScanError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch active events for selection
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events', { status: 'published' }],
    queryFn: () => adminGetEvents({ limit: 100 }), // Simplified fetch
  });

  const events = eventsRes?.data || [];

  // Auto-focus input when event is selected
  useEffect(() => {
    if (selectedEventId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedEventId, lastScanResult, lastScanError]);

  const scanMutation = useMutation({
    mutationFn: (tid: string) => adminScanTicket(tid, selectedEventId),
    onSuccess: (data) => {
      setLastScanResult(data);
      setLastScanError(null);
      setTicketId('');
    },
    onError: (err) => {
      setLastScanError(extractApiError(err).message);
      setLastScanResult(null);
      setTicketId('');
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

  const syncOfflineScans = async () => {
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
  };

  useEffect(() => {
    if (!isOffline) {
      syncOfflineScans();
    } else {
      import('@/lib/offline-scanner.service').then(({ getOfflineScans }) => {
        getOfflineScans().then(scans => setOfflineCount(scans.length));
      });
    }
  }, [isOffline]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim() || !selectedEventId) return;

    if (isOffline) {
      const { saveOfflineScan } = await import('@/lib/offline-scanner.service');
      await saveOfflineScan(ticketId.trim(), selectedEventId);
      setOfflineCount(prev => prev + 1);
      setLastScanResult({ ticketId: ticketId.trim(), admits: 'OFFLINE MODE', tierName: 'SAVED LOCALLY' });
      setLastScanError(null);
      setTicketId('');
    } else {
      scanMutation.mutate(ticketId.trim());
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
                ADMIT: {lastScanResult.admits} {lastScanResult.admits > 1 ? 'PEOPLE' : 'PERSON'}
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
      </AnimatePresence>
    </div>
  );
}
