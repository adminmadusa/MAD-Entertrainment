import { InventoryState, ReservationStatus } from '@mad/shared';

import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';


const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.RESERVED]: [ReservationStatus.PENDING_PAYMENT, ReservationStatus.EXPIRED, ReservationStatus.CANCELLED],
  [ReservationStatus.PENDING_PAYMENT]: [ReservationStatus.CONFIRMED, ReservationStatus.FAILED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.REFUNDED, ReservationStatus.CANCELLED],
  [ReservationStatus.EXPIRED]: [ReservationStatus.CONFIRMED],
  [ReservationStatus.CANCELLED]: [],
  [ReservationStatus.FAILED]: [ReservationStatus.CONFIRMED],
  [ReservationStatus.REFUNDED]: [],
};


export function assertReservationTransition(from: ReservationStatus, to: ReservationStatus, context: Record<string, unknown>) {
  if (!RESERVATION_TRANSITIONS[from]?.includes(to)) {
    logger.warn({ from, to, ...context }, 'Invalid reservation transition rejected');
    throw AppError.badRequest(`Invalid reservation transition: ${from} -> ${to}`);
  }
}

export function reservationToInventoryState(status: ReservationStatus): InventoryState {
  switch (status) {
    case ReservationStatus.RESERVED:
      return InventoryState.RESERVED;
    case ReservationStatus.PENDING_PAYMENT:
      return InventoryState.PENDING_PAYMENT;
    case ReservationStatus.CONFIRMED:
      return InventoryState.BOOKED;
    case ReservationStatus.EXPIRED:
      return InventoryState.EXPIRED;
    case ReservationStatus.FAILED:
      return InventoryState.FAILED;
    case ReservationStatus.CANCELLED:
      return InventoryState.CANCELLED;
    case ReservationStatus.REFUNDED:
      return InventoryState.REFUNDED;
  }
}
