/**
 * Calculates total ticket count and subtotal for selected quantities.
 */
export function calculateBookingTotals(
  quantities: Record<string, number>,
  ticketTiers: Array<{ tier: string; price: number; discount?: number }>
) {
  let totalTickets = 0;
  let subtotal = 0;

  ticketTiers.forEach((tier) => {
    const qty = quantities[tier.tier] || 0;
    if (qty > 0) {
      totalTickets += qty;
      const price = Math.max(0, tier.price - (tier.discount || 0));
      subtotal += price * qty;
    }
  });

  return { totalTickets, subtotal };
}

/**
 * Formats ticket count to strictly match "X Ticket" / "X Tickets".
 */
export function formatTicketCount(qty: number): string {
  return `${qty} ${qty === 1 ? 'Ticket' : 'Tickets'}`;
}

/**
 * Formats raw/internal slug string to human readable name.
 * e.g. "early_bird" -> "Early Bird", "platinum" -> "Platinum"
 */
export function formatDisplayName(name: string): string {
  if (!name) return '';
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

