import { startBookingWorker, stopBookingWorker } from "./booking.worker";
import { startPDFWorker, stopPDFWorker } from "./pdf.worker";
import { startEmailWorker, stopEmailWorker } from "./email.worker";

/**
 * Boot up all background workers
 */
export function startAllWorkers(): void {
  startBookingWorker();
  startPDFWorker();
  startEmailWorker();
}

/**
 * Shut down all background workers gracefully
 */
export async function stopAllWorkers(): Promise<void> {
  await Promise.all([stopBookingWorker(), stopPDFWorker(), stopEmailWorker()]);
}
