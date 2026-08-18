'use client';

import { EmptyState } from '@mad/ui';
import { Scan, Search } from '@mad/ui/icons';

import { ScannerHistoryItem } from '../../lib/api/admin/scanner.service';

interface ScanHistoryProps {
  items: ScannerHistoryItem[];
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  search: string;
  setSearch: (search: string) => void;
}

const HISTORY_STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  ALREADY_SCANNED: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  INVALID: 'bg-red-500/10 border-red-500/20 text-red-400',
  WRONG_EVENT: 'bg-red-500/10 border-red-500/20 text-red-400',
  OFFLINE_QUEUED: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  ERROR: 'bg-red-500/10 border-red-500/20 text-red-400',
};

export function ScanHistory({
  items,
  isLoading,
  page,
  setPage,
  totalPages,
  filterStatus,
  setFilterStatus,
  search,
  setSearch,
}: ScanHistoryProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5 bg-background-card/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Gate Audit Log & History</h2>
          <p className="text-text-muted text-xs mt-0.5">Chronological record of all barcode validations, claims, and entry attempts</p>
        </div>

        {/* Filters with >= 44px touch targets */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket / guest / email..."
              className="w-full bg-background border border-border-subtle text-white text-xs rounded-xl pl-9 pr-3.5 py-2.5 min-h-[44px] focus-ring"
              aria-label="Search scan history"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background border border-border-subtle text-white text-xs rounded-xl px-3.5 py-2.5 min-h-[44px] focus-ring"
            aria-label="Filter by scan status"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Verified Entry (Success)</option>
            <option value="ALREADY_SCANNED">Duplicate Scans</option>
            <option value="INVALID">Invalid / Rejected</option>
          </select>
        </div>
      </div>

      {/* History List */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 text-text-muted font-semibold">
              <th className="py-3 px-4">Ticket ID</th>
              <th className="py-3 px-4">Guest Name</th>
              <th className="py-3 px-4">Tier</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Scan Source</th>
              <th className="py-3 px-4 text-right">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-text-secondary">
                  <div className="inline-block w-5 h-5 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Loading audit log entries...</span>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12">
                  <EmptyState
                    variant="table"
                    icon={search.trim() !== '' ? <Search /> : <Scan />}
                    title={search.trim() !== '' ? 'No matching scan records' : 'No scans recorded yet'}
                    description={search.trim() !== '' ? 'Try adjusting your search keywords or filter.' : 'Scans will appear here as attendees check in.'}
                  />
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="text-white hover:bg-white/2 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-accent-purple text-xs">{item.ticketId}</td>
                  <td className="py-3.5 px-4 font-medium text-white">{item.guestName || '—'}</td>
                  <td className="py-3.5 px-4 text-text-secondary">{item.tierName || 'Standard'}</td>
                  <td className="py-3.5 px-4 text-text-secondary tabular-nums">
                    {new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary capitalize">
                    {item.offline ? (
                      <span className="inline-flex items-center gap-1.5 text-blue-400 font-bold text-xxs">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        Offline
                      </span>
                    ) : (
                      item.scanSource
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-md border text-xxs font-bold uppercase tracking-wider ${
                        HISTORY_STATUS_STYLES[item.status] || 'bg-white/5 border-white/10 text-text-muted'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-text-secondary font-bold">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2.5 min-h-[44px] bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-ring flex items-center justify-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Previous</span>
          </button>
          <span className="tabular-nums">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2.5 min-h-[44px] bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-ring flex items-center justify-center gap-1.5"
          >
            <span>Next</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
