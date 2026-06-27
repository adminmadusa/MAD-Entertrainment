import { ReservationDiagnosticsRow } from '@/lib/api/admin/diagnostics.service';
import { formatDateTime } from '@mad/utils';

export interface ReservationLedgerTabProps {
  reservations: ReservationDiagnosticsRow[] | undefined;
  reservationStatus: string;
  onStatusChange: (status: string) => void;
}

export function ReservationLedgerTab({
  reservations,
  reservationStatus,
  onStatusChange,
}: ReservationLedgerTabProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <h2 className="text-white font-bold text-sm">Active Reservation Ledger</h2>
        <select
          value={reservationStatus}
          onChange={(event) => onStatusChange(event.target.value)}
          className="px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary outline-none"
        >
          <option value="">All statuses</option>
          <option value="reserved">Reserved</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="confirmed">Confirmed</option>
          <option value="expired">Expired</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted text-left">
              {['Reservation', 'Status', 'Inventory', 'Qty', 'Seat/Section', 'Booking', 'Version', 'Expires'].map(
                (heading) => (
                  <th key={heading} className="font-medium py-3 px-4">
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {(reservations ?? []).map((res) => (
              <tr key={res._id} className="border-b border-border-subtle/40 hover:bg-white/[0.01]">
                <td className="py-3 px-4 font-mono text-accent-purple">{res.reservationId}</td>
                <td className="py-3 px-4 text-white capitalize">{res.status.replace('_', ' ')}</td>
                <td className="py-3 px-4 text-text-secondary capitalize">{res.inventoryState}</td>
                <td className="py-3 px-4 text-text-secondary font-bold text-center">{res.quantity}</td>
                <td className="py-3 px-4 text-text-secondary">{res.seatId ?? res.section ?? '—'}</td>
                <td className="py-3 px-4 text-text-secondary font-semibold">{res.bookingReference ?? '—'}</td>
                <td className="py-3 px-4 text-text-muted text-center">{res.reservationVersion}</td>
                <td className="py-3 px-4 text-text-secondary">{formatDateTime(res.expiresAt)}</td>
              </tr>
            ))}
            {!reservations?.length && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-text-muted">
                  No reservation logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
