export interface ConsistencyReport {
  generatedAt: string;
  counts?: {
    activeReservations: number;
    expiredReservations: number;
    redisLocks: number;
    awaitingPaymentBookings: number;
    orphanPayments: number;
  };
  drift?: {
    staleSeatReservations: number;
    phantomRedisLocks: number;
    eventInventoryMismatches: number;
    unticketedConfirmedBookings: number;
    stuckNotifications: number;
    orphanedConfirmedDeliveries: number;
    paidPaymentMismatches?: number;
    stuckProcessingRefunds?: number;
    orphanedRefundNotifications?: number;
    orphanedCancellationNotifications?: number;
  };
  repairs?: {
    expiredReservations: number;
    phantomRedisLocks: number;
    staleSeatReservations: number;
    eventInventoryMismatchesRepaired?: number;
    logicallyExpiredBookings?: number;
    reEnqueuedUnticketedBookings?: number;
    resetStuckNotifications?: number;
    reEnqueuedOrphanedDeliveries?: number;
    repairedPaidPaymentMismatches?: number;
    repairedStuckProcessingRefunds?: number;
    repairedOrphanedRefundNotifications?: number;
    repairedOrphanedCancellationNotifications?: number;
  };
}

export interface ConsistencyRepairOptions {
  includeReport?: boolean;
}
