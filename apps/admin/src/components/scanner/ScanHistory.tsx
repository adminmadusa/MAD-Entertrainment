'use client';

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
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4 bg-background-card/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Scan Log History</h2>
          <p className="text-text-muted text-xs mt-1">Audit log of gate validations and check-in activities</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket / guest..."
            className="bg-background border border-border-subtle text-white text-xs rounded-lg px-3 py-1.5 focus:border-accent-purple outline-none w-44"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background border border-border-subtle text-white text-xs rounded-lg px-2.5 py-1.5 focus:border-accent-purple outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="ALREADY_SCANNED">Already Scanned</option>
            <option value="INVALID">Invalid</option>
          </select>
        </div>
      </div>

      {/* History List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-text-muted font-semibold">
              <th className="py-2.5">Ticket ID</th>
              <th className="py-2.5">Guest</th>
              <th className="py-2.5">Tier</th>
              <th className="py-2.5">Time</th>
              <th className="py-2.5">Source</th>
              <th className="py-2.5 text-right">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-secondary">
                  Loading history logs...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-muted">
                  No scan history records found matching current criteria.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="text-white hover:bg-white/2 transition-colors">
                  <td className="py-3 font-mono text-text-secondary">{item.ticketId}</td>
                  <td className="py-3 font-medium">{item.guestName}</td>
                  <td className="py-3 text-text-secondary">{item.tierName}</td>
                  <td className="py-3 text-text-secondary">
                    {new Date(item.scannedAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 text-text-secondary capitalize">
                    {item.offline ? (
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        Offline
                      </span>
                    ) : (
                      item.scanSource
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-md border text-xxs font-bold uppercase tracking-wider ${
                      HISTORY_STATUS_STYLES[item.status] || 'bg-white/5 border-white/10 text-text-muted'
                    }`}>
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
        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xxs text-text-secondary font-bold">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
