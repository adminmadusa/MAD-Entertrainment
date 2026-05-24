"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertInventoryTransition = assertInventoryTransition;
exports.assertReservationTransition = assertReservationTransition;
exports.reservationToInventoryState = reservationToInventoryState;
const shared_1 = require("@mad/shared");
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = require("../utils/logger");
const INVENTORY_TRANSITIONS = {
    [shared_1.InventoryState.AVAILABLE]: [shared_1.InventoryState.RESERVED],
    [shared_1.InventoryState.RESERVED]: [shared_1.InventoryState.PENDING_PAYMENT, shared_1.InventoryState.EXPIRED],
    [shared_1.InventoryState.PENDING_PAYMENT]: [shared_1.InventoryState.BOOKED, shared_1.InventoryState.FAILED],
    [shared_1.InventoryState.BOOKED]: [shared_1.InventoryState.REFUNDED, shared_1.InventoryState.CANCELLED],
    [shared_1.InventoryState.EXPIRED]: [],
    [shared_1.InventoryState.FAILED]: [],
    [shared_1.InventoryState.REFUNDED]: [],
    [shared_1.InventoryState.CANCELLED]: [],
};
const RESERVATION_TRANSITIONS = {
    [shared_1.ReservationStatus.RESERVED]: [shared_1.ReservationStatus.PENDING_PAYMENT, shared_1.ReservationStatus.EXPIRED, shared_1.ReservationStatus.CANCELLED],
    [shared_1.ReservationStatus.PENDING_PAYMENT]: [shared_1.ReservationStatus.CONFIRMED, shared_1.ReservationStatus.FAILED, shared_1.ReservationStatus.CANCELLED],
    [shared_1.ReservationStatus.CONFIRMED]: [shared_1.ReservationStatus.REFUNDED, shared_1.ReservationStatus.CANCELLED],
    [shared_1.ReservationStatus.EXPIRED]: [],
    [shared_1.ReservationStatus.CANCELLED]: [],
    [shared_1.ReservationStatus.FAILED]: [],
    [shared_1.ReservationStatus.REFUNDED]: [],
};
function assertInventoryTransition(from, to, context) {
    if (!INVENTORY_TRANSITIONS[from]?.includes(to)) {
        logger_1.logger.warn({ from, to, ...context }, 'Invalid inventory transition rejected');
        throw error_middleware_1.AppError.badRequest(`Invalid inventory transition: ${from} -> ${to}`);
    }
}
function assertReservationTransition(from, to, context) {
    if (!RESERVATION_TRANSITIONS[from]?.includes(to)) {
        logger_1.logger.warn({ from, to, ...context }, 'Invalid reservation transition rejected');
        throw error_middleware_1.AppError.badRequest(`Invalid reservation transition: ${from} -> ${to}`);
    }
}
function reservationToInventoryState(status) {
    switch (status) {
        case shared_1.ReservationStatus.RESERVED:
            return shared_1.InventoryState.RESERVED;
        case shared_1.ReservationStatus.PENDING_PAYMENT:
            return shared_1.InventoryState.PENDING_PAYMENT;
        case shared_1.ReservationStatus.CONFIRMED:
            return shared_1.InventoryState.BOOKED;
        case shared_1.ReservationStatus.EXPIRED:
            return shared_1.InventoryState.EXPIRED;
        case shared_1.ReservationStatus.FAILED:
            return shared_1.InventoryState.FAILED;
        case shared_1.ReservationStatus.CANCELLED:
            return shared_1.InventoryState.CANCELLED;
        case shared_1.ReservationStatus.REFUNDED:
            return shared_1.InventoryState.REFUNDED;
    }
}
//# sourceMappingURL=inventory-state.service.js.map