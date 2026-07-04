import { ReservationDiagnosticsRow } from '@/lib/api/admin/diagnostics.service';
import { formatDateTime } from '@mad/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@mad/ui';

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
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="text-left text-text-muted">
            {['Reservation', 'Status', 'Inventory', 'Qty', 'Seat/Section', 'Booking', 'Version', 'Expires'].map(
              (heading) => (
                <TableHead key={heading} className="font-medium py-3 px-4">
                  {heading}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(reservations ?? []).map((res) => (
            <TableRow key={res._id} className="border-b border-border-subtle/40 hover:bg-white/[0.01]">
              <TableCell className="py-3 px-4 font-mono text-accent-purple">{res.reservationId}</TableCell>
              <TableCell className="py-3 px-4 text-white capitalize">{res.status.replace('_', ' ')}</TableCell>
              <TableCell className="py-3 px-4 text-text-secondary capitalize">{res.inventoryState}</TableCell>
              <TableCell className="py-3 px-4 text-text-secondary font-bold text-center">{res.quantity}</TableCell>
              <TableCell className="py-3 px-4 text-text-secondary">{res.seatId ?? res.section ?? '—'}</TableCell>
              <TableCell className="py-3 px-4 text-text-secondary font-semibold">{res.bookingReference ?? '—'}</TableCell>
              <TableCell className="py-3 px-4 text-text-muted text-center">{res.reservationVersion}</TableCell>
              <TableCell className="py-3 px-4 text-text-secondary">{formatDateTime(res.expiresAt)}</TableCell>
            </TableRow>
          ))}
          {!reservations?.length && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-text-muted">
                No reservation logs found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
