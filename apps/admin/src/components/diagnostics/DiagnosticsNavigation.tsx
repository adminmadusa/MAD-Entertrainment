import Link from 'next/link';

export interface DiagnosticsNavigationProps {
  activeSubTab: 'health' | 'queues' | 'dlq' | 'reservations';
  setActiveSubTab: (tab: 'health' | 'queues' | 'dlq' | 'reservations') => void;
  dlqCount: number;
  isDlqBulkReplayBlocked: boolean;
}

export function DiagnosticsNavigation({
  activeSubTab,
  setActiveSubTab,
  dlqCount,
  isDlqBulkReplayBlocked,
}: DiagnosticsNavigationProps) {
  return (
    <>
      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-border-subtle">
        <Link
          href="/diagnostics"
          className="px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] border-accent-purple text-accent-purple-light"
        >
          Consistency & Health
        </Link>
        <Link
          href="/diagnostics/webhooks"
          className="px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] border-transparent text-text-secondary hover:text-text-primary"
        >
          Webhooks
        </Link>
        <Link
          href="/diagnostics/emails"
          className="px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] border-transparent text-text-secondary hover:text-text-primary"
        >
          Email Logs
        </Link>
      </div>

      {/* Sub tabs inside Consistency & Health workspace */}
      <div className="flex space-x-2 bg-white/5 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveSubTab('health')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'health' ? 'bg-white/10 text-white shadow' : 'text-text-secondary hover:text-white'
          }`}
        >
          Health & Metrics
        </button>
        <button
          onClick={() => setActiveSubTab('queues')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'queues' ? 'bg-white/10 text-white shadow' : 'text-text-secondary hover:text-white'
          }`}
        >
          Queue Controls
        </button>
        <button
          onClick={() => setActiveSubTab('dlq')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'dlq' ? 'bg-white/10 text-white shadow' : 'text-text-secondary hover:text-white'
          }`}
        >
          Dead Letter Queue
          {dlqCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                isDlqBulkReplayBlocked ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
              }`}
            >
              {dlqCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('reservations')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'reservations' ? 'bg-white/10 text-white shadow' : 'text-text-secondary hover:text-white'
          }`}
        >
          Reservation Ledger
        </button>
      </div>
    </>
  );
}
