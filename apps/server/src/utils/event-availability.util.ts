import { TicketSalesCloseMode } from '@mad/shared';
import type { IEvent } from '../models/event.schema';

/**
 * Evaluates whether ticket sales are closed for a given event based on its
 * configured TicketSalesCloseMode policy.
 * 
 * @param event The event object
 * @param now Optional date to evaluate against (defaults to new Date())
 * @returns boolean true if sales are closed, false if sales are open
 */
export function isEventTicketSalesClosed(event: Partial<IEvent>, now: Date = new Date()): boolean {
  const mode = event.ticketSalesCloseMode || TicketSalesCloseMode.EVENT_START;

  switch (mode) {
    case TicketSalesCloseMode.EVENT_END:
      if (!event.endDate) return false;
      return now >= new Date(event.endDate);
      
    case TicketSalesCloseMode.CUSTOM_DATE:
      if (!event.ticketSalesCloseDate) return false;
      return now >= new Date(event.ticketSalesCloseDate);
      
    case TicketSalesCloseMode.EVENT_START:
    default:
      if (!event.startDate) return false;
      return now >= new Date(event.startDate);
  }
}
