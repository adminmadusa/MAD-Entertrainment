export interface BookingsSummaryResponse {
  totalBookings: number;
  totalTickets: number;
  revenue: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  checkedIn: number;
}
