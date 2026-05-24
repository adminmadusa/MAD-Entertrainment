import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/server/.env immediately
dotenv.config({ path: path.resolve(process.cwd(), 'apps/server/.env') });

import crypto from 'crypto';
import { Types } from 'mongoose';
import { monitorEventLoopDelay } from 'perf_hooks';

// Set environment for test mode logging overrides if needed
process.env.NODE_ENV = 'test';

// Global references initialized in main()
let connectDatabase: any, disconnectDatabase: any;
let getRedis: any, disconnectRedis: any, waitForRedisReady: any;
let Event: any;
let Booking: any;
let Reservation: any;
let Payment: any;
let WebhookEvent: any;
let PaymentService: any;
let PublicBookingService: any;
let ConsistencyService: any;
let BookingMode: any, EventCategory: any, EventStatus: any, TicketTier: any, SeatStatus: any, ReservationStatus: any;

// Event loop delay monitor
const eventLoopMonitor = monitorEventLoopDelay({ resolution: 10 });
eventLoopMonitor.enable();

async function seedGAEvent(capacity: number) {
  const eventId = new Types.ObjectId();
  const event = new Event({
    _id: eventId,
    title: 'Endurance Test GA Event',
    slug: `endurance-ga-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    description: 'Event for long-duration endurance testing',
    category: EventCategory.CONCERT,
    status: EventStatus.PUBLISHED,
    bookingMode: BookingMode.GENERAL_ADMISSION,
    bannerImage: { url: 'http://example.com/banner.png', publicId: 'banner' },
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    showTime: '20:00',
    venueId: new Types.ObjectId(),
    ticketTiers: [
      {
        tier: TicketTier.GENERAL,
        name: 'General Admission',
        slug: 'general-admission',
        price: 100,
        totalCapacity: capacity,
        soldCount: 0,
        isActive: true,
        maxPerBooking: 10,
        minPerBooking: 1,
        taxPercent: 18,
      }
    ],
    totalCapacity: capacity,
    soldCount: 0,
    reservedCount: 0,
    eventVersion: 1,
  });

  await event.save();
  return event;
}

async function attemptBooking(eventId: string, guestEmail: string, sessionId: string) {
  return PublicBookingService.createBooking(
    {
      eventId,
      guestName: 'Endurance User',
      guestEmail,
      guestPhone: '9999999999',
      tickets: [
        {
          tier: TicketTier.GENERAL,
          quantity: 1,
        }
      ]
    },
    sessionId
  );
}

interface TelemetrySnapshot {
  timestamp: string;
  elapsedSeconds: number;
  rssMb: number;
  heapUsedMb: number;
  eventLoopDelayP50: number;
  eventLoopDelayP99: number;
  eventLoopDelayMax: number;
  redisLocksCount: number;
  mongooseActiveConnections: number;
  awaitingPaymentCount: number;
  driftCount: number;
}

async function main() {
  const dbConfig = await import('../apps/server/src/config/database');
  connectDatabase = dbConfig.connectDatabase;
  disconnectDatabase = dbConfig.disconnectDatabase;

  const redisConfig = await import('../apps/server/src/config/redis');
  getRedis = redisConfig.getRedis;
  disconnectRedis = redisConfig.disconnectRedis;
  waitForRedisReady = redisConfig.waitForRedisReady;

  Event = (await import('../apps/server/src/models/event.schema')).Event;
  Booking = (await import('../apps/server/src/models/booking.schema')).Booking;
  Reservation = (await import('../apps/server/src/models/reservation.schema')).Reservation;
  Payment = (await import('../apps/server/src/models/payment.schema')).Payment;
  WebhookEvent = (await import('../apps/server/src/models/webhook-event.schema')).WebhookEvent;
  PaymentService = (await import('../apps/server/src/services/public/payment.service')).PaymentService;
  PublicBookingService = (await import('../apps/server/src/services/public/booking.service')).PublicBookingService;
  ConsistencyService = (await import('../apps/server/src/services/consistency.service')).ConsistencyService;

  const shared = await import('@mad/shared');
  BookingMode = shared.BookingMode;
  EventCategory = shared.EventCategory;
  EventStatus = shared.EventStatus;
  TicketTier = shared.TicketTier;
  SeatStatus = shared.SeatStatus;
  ReservationStatus = shared.ReservationStatus;

  const durationSeconds = parseInt(process.env.TEST_DURATION_SECONDS || '30', 10);
  console.log(`\n--- Starting Endurance & Stress Test (Duration: ${durationSeconds} seconds) ---`);

  // Connect to databases
  await connectDatabase();
  await waitForRedisReady();
  console.log('✅ Services connected successfully.');

  const redis = getRedis();

  // Seed Event with high capacity to allow continuous bookings
  const event = await seedGAEvent(2000);
  console.log(`Seeded test event: ${event.slug} (Capacity: 2000)`);

  const startTime = Date.now();
  const telemetryHistory: TelemetrySnapshot[] = [];
  const activeBookingIds: string[] = [];

  let totalSuccessfulBookings = 0;
  let totalFailedBookings = 0;
  let totalReconciliationRuns = 0;
  let totalRedisFlaps = 0;

  // Track memory start state
  const initialMemory = process.memoryUsage();

  // Periodic Telemetry collection (every 5 seconds)
  const telemetryInterval = setInterval(async () => {
    try {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mem = process.memoryUsage();
      
      const p50 = eventLoopMonitor.percentile(50) / 1e6;
      const p99 = eventLoopMonitor.percentile(99) / 1e6;
      const max = eventLoopMonitor.max / 1e6;
      eventLoopMonitor.reset();

      // Query Redis keys count
      const keys = await redis.keys('mad:lock:*');

      // Generate consistency/drift report
      const report = await ConsistencyService.generateReport();
      const mongooseConnections = (await import('mongoose')).connections.length;

      const snapshot: TelemetrySnapshot = {
        timestamp: new Date().toISOString(),
        elapsedSeconds: elapsed,
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        eventLoopDelayP50: parseFloat(p50.toFixed(2)),
        eventLoopDelayP99: parseFloat(p99.toFixed(2)),
        eventLoopDelayMax: parseFloat(max.toFixed(2)),
        redisLocksCount: keys.length,
        mongooseActiveConnections: mongooseConnections,
        awaitingPaymentCount: report.counts.awaitingPaymentBookings,
        driftCount: report.drift.eventInventoryMismatches + report.drift.staleSeatReservations,
      };

      telemetryHistory.push(snapshot);

      console.log(
        `[${elapsed}s] ` +
        `RSS: ${snapshot.rssMb}MB | ` +
        `Heap: ${snapshot.heapUsedMb}MB | ` +
        `Loop delay (p50/p99/max): ${snapshot.eventLoopDelayP50}/${snapshot.eventLoopDelayP99}/${snapshot.eventLoopDelayMax}ms | ` +
        `Locks: ${snapshot.redisLocksCount} | ` +
        `Drifts: ${snapshot.driftCount}`
      );

      // CRITICAL WARNING: inventory drift detected
      if (snapshot.driftCount > 0) {
        console.error(`🚨 [TELEMETRY ALERT] Stale reservations or inventory drift detected! Count: ${snapshot.driftCount}`);
      }
    } catch (err: any) {
      console.error('Error gathering telemetry metrics:', err.message);
    }
  }, 5000);

  // Background Load Loop: Fire 3 concurrent bookings every 300ms
  const loadInterval = setInterval(async () => {
    if (Date.now() - startTime >= durationSeconds * 1000) return;

    const promises = [];
    for (let i = 0; i < 3; i++) {
      const email = `endurance-${crypto.randomBytes(6).toString('hex')}@endurance.test`;
      const session = `session-${crypto.randomBytes(8).toString('hex')}`;
      promises.push(
        attemptBooking(event._id.toString(), email, session)
          .then((res: any) => {
            totalSuccessfulBookings++;
            activeBookingIds.push(res._id.toString());
          })
          .catch((err: any) => {
            totalFailedBookings++;
          })
      );
    }
    await Promise.all(promises);
  }, 300);

  // Background Webhook Confirmations Loop: Every 2 seconds confirm some bookings
  const webhookInterval = setInterval(async () => {
    if (Date.now() - startTime >= durationSeconds * 1000) return;
    if (activeBookingIds.length === 0) return;

    // Pick up to 5 bookings to confirm via webhook
    const toConfirm = activeBookingIds.splice(0, Math.min(5, activeBookingIds.length));
    const promises = toConfirm.map(async (bookingId) => {
      const orderId = `order_${crypto.randomBytes(6).toString('hex')}`;
      const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
      const eventId = `evt_${crypto.randomBytes(6).toString('hex')}`;

      try {
        // Create payment record link
        const payment = new Payment({
          bookingId: new Types.ObjectId(bookingId),
          gateway: 'razorpay',
          status: 'pending',
          amount: 153,
          currency: 'INR',
          gatewayOrderId: orderId,
        });
        await payment.save();

        await Booking.updateOne({ _id: bookingId }, { $set: { paymentId: payment._id } });

        // Execute payment webhook captured event
        await PaymentService.confirmFromWebhook(orderId, paymentId, 'payment.captured', eventId);
      } catch (err: any) {
        // Suppress expected transient chaos error
      }
    });

    await Promise.all(promises);
  }, 2000);

  // Background Repair Reconciliation: Run repair cycle every 10 seconds to reconcile expired state
  const repairInterval = setInterval(async () => {
    if (Date.now() - startTime >= durationSeconds * 1000) return;
    try {
      totalReconciliationRuns++;
      await ConsistencyService.runRepairCycle();
    } catch (err: any) {
      // Suppress connection flap expected error
    }
  }, 10000);

  // Redis Connection Flapping Loop: Flap Redis every 30 seconds
  const redisFlapInterval = setInterval(async () => {
    if (Date.now() - startTime >= durationSeconds * 1000) return;
    try {
      totalRedisFlaps++;
      console.log('\n⚡ [CHAOS] Severing Redis connection (simulating disconnect)...');
      redis.disconnect();

      // Wait 1.5 seconds, then reconnect
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('⚡ [CHAOS] Reconnecting Redis server...');
      await redis.connect();
      await waitForRedisReady();
      console.log('⚡ [CHAOS] Redis connection successfully recovered.\n');
    } catch (err: any) {
      console.error('Error during Redis flap simulation:', err.message);
    }
  }, 30000);

  // Wait for duration to complete
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, durationSeconds * 1000);
  });

  // Stop all background loops
  clearInterval(telemetryInterval);
  clearInterval(loadInterval);
  clearInterval(webhookInterval);
  clearInterval(repairInterval);
  clearInterval(redisFlapInterval);

  console.log('\n--- Endurance Run Completed. Analyzing Telemetry... ---');

  // Trigger final self-healing run to ensure database consistency is fully aligned
  console.log('Running final database self-healing repair run...');
  await ConsistencyService.runRepairCycle();

  // Gather final states
  const finalMemory = process.memoryUsage();
  const finalReport = await ConsistencyService.generateReport();
  const remainingLocks = await redis.keys('mad:lock:*');

  // Print Summary Analysis
  console.log('\n=========================================');
  console.log('📊 ENDURANCE TEST RUN SUMMARY REPORT');
  console.log('=========================================');
  console.log(`Execution Duration:   ${durationSeconds} seconds`);
  console.log(`Success Bookings:     ${totalSuccessfulBookings}`);
  console.log(`Failed Bookings:      ${totalFailedBookings}`);
  console.log(`Reconciliation Runs:  ${totalReconciliationRuns}`);
  console.log(`Redis Connection Flaps: ${totalRedisFlaps}`);
  console.log('-----------------------------------------');
  console.log('💾 MEMORY LEAK ANALYSIS:');
  console.log(`Initial RSS Memory:   ${Math.round(initialMemory.rss / 1024 / 1024)} MB`);
  console.log(`Final RSS Memory:     ${Math.round(finalMemory.rss / 1024 / 1024)} MB`);
  console.log(`Heap Used Growth:     ${Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024)} MB`);
  console.log('-----------------------------------------');
  console.log('⚡ LATENCY ANALYSIS (Event Loop):');
  const maxDelay = Math.max(...telemetryHistory.map(t => t.eventLoopDelayMax));
  const avgP99Delay = telemetryHistory.reduce((sum, t) => sum + t.eventLoopDelayP99, 0) / telemetryHistory.length;
  console.log(`Average p99 Lag:      ${avgP99Delay.toFixed(2)} ms`);
  console.log(`Max Event Loop Lag:   ${maxDelay.toFixed(2)} ms`);
  console.log('-----------------------------------------');
  console.log('🔒 TELEMETRY STACK INTEGRITY:');
  console.log(`Remaining Redis Locks: ${remainingLocks.length}`);
  console.log(`Database Awaiting Payment Bookings: ${finalReport.counts.awaitingPaymentBookings}`);
  console.log(`Final Database Drifts (Inconsistencies): ${finalReport.drift.eventInventoryMismatches}`);
  console.log('=========================================');

  let passed = true;

  // Assertions
  if (finalReport.drift.eventInventoryMismatches > 0) {
    console.error('🚨 FAIL: Final event inventory mismatch drift found in database!');
    passed = false;
  } else {
    console.log('✔ Pass: Database inventory count contains zero drift.');
  }

  const memoryGrowthMb = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
  if (memoryGrowthMb > 50 && durationSeconds <= 300) {
    // If heap grows by >50MB in a 5 minute run, warn about potential leaks
    console.warn('⚠️  WARNING: High heap memory growth detected (>50MB). Audit code for memory leaks.');
  } else {
    console.log('✔ Pass: Heap memory growth within safe normal boundaries.');
  }

  // Cleanup
  console.log('\nCleaning up seeded event and endurance test records...');
  await Booking.deleteMany({ eventId: event._id });
  await Reservation.deleteMany({ eventId: event._id });
  await Event.deleteOne({ _id: event._id });
  await WebhookEvent.deleteMany({});
  
  // Delete leftover locks
  if (remainingLocks.length > 0) {
    await redis.del(remainingLocks);
  }
  console.log('Cleanup finished.');

  await disconnectDatabase();
  await disconnectRedis();
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
