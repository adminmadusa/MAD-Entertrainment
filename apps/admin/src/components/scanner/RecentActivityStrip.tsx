import { ScannerHistoryItem } from '../../lib/api/admin/scanner.service';

const RECENT_ACTIVITY_STATUS: Record<string, { dot: string; text: string }> = {
  SUCCESS: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  OFFLINE_QUEUED: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  ALREADY_SCANNED: { dot: 'bg-amber-500', text: 'text-amber-400' },
  INVALID: { dot: 'bg-red-500', text: 'text-red-400' },
  WRONG_EVENT: { dot: 'bg-red-500', text: 'text-red-400' },
  EXPIRED: { dot: 'bg-orange-500', text: 'text-orange-400' },
  ERROR: { dot: 'bg-red-500', text: 'text-red-400' },
};

export function RecentActivityStrip({ items }: { items: ScannerHistoryItem[] }) {
  const recent = items.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <div className="glass rounded-2xl border border-border-subtle p-4 bg-background-card/50 space-y-3">
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Recent Activity</h3>
      <div className="space-y-2.5">
        {recent.map((item) => {
          const style = RECENT_ACTIVITY_STATUS[item.status] ?? { dot: 'bg-white/30', text: 'text-text-muted' };
          const label = item.guestName || item.ticketId || item.status.replace('_', ' ');
          return (
            <div key={item.id} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${style.text}`}>{label}</p>
                {item.tierName && (
                  <p className="text-[10px] text-text-muted truncate">{item.tierName}</p>
                )}
              </div>
              <span className="text-[10px] text-text-muted flex-shrink-0 tabular-nums">
                {new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
