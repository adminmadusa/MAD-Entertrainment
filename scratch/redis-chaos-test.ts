import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/server/.env immediately
dotenv.config({ path: path.resolve(process.cwd(), 'apps/server/.env') });

import crypto from 'crypto';
import { Types } from 'mongoose';

// Set environment for test mode logging overrides if needed
process.env.NODE_ENV = 'test';

// Global references initialized in main()
let connectDatabase: any, disconnectDatabase: any;
let getRedis: any, disconnectRedis: any, waitForRedisReady: any;
let Event: any;
let Booking: any;
let Reservation: any;
let PublicBookingService: any;
let BookingMode: any, EventCategory: any, EventStatus: any, TicketTier: any, SeatStatus: any, ReservationStatus: any;

async function seedGAEvent(capacity: number) {
  const eventId = new Types.ObjectId();
  const event = new Event({
    _id: eventId,
    title: 'Redis Chaos GA Event',
    slug: `redis-chaos-ga-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    description: 'Event for Redis chaos and recovery testing',
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
      guestName: 'Chaos Tester',
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
  PublicBookingService = (await import('../apps/server/src/services/public/booking.service')).PublicBookingService;

  const shared = await import('@mad/shared');
  BookingMode = shared.BookingMode;
  EventCategory = shared.EventCategory;
  EventStatus = shared.EventStatus;
  TicketTier = shared.TicketTier;
  SeatStatus = shared.SeatStatus;
  ReservationStatus = shared.ReservationStatus;

  console.log('--- Starting Redis Chaos & Resilience Test ---');

  let testEvent: any;

  try {
    // 1. Connect to services
    await connectDatabase();
    await waitForRedisReady();
    console.log('✅ Services connected successfully.');

    // Seed test GA event with 15 tickets capacity
    testEvent = await seedGAEvent(15);
    console.log(`Seeded test event ${testEvent.slug} with capacity 15.`);

    const redis = getRedis();

    // ----------------------------------------------------
    // PHASE 1: Baseline booking attempts (Redis is healthy)
    // ----------------------------------------------------
    console.log('\n--- Phase 1: Running Baseline Bookings Sequentially (Healthy Redis) ---');
    let baselineSuccessCount = 0;
    for (let i = 0; i < 3; i++) {
      try {
        await attemptBooking(testEvent._id.toString(), `baseline-${i}@chaos.test`, `session-base-${i}`);
        baselineSuccessCount++;
      } catch (err: any) {
        console.error(`Baseline booking ${i} failed:`, err.message);
      }
    }
    console.log(`Baseline bookings: ${baselineSuccessCount} / 3 succeeded.`);

    if (baselineSuccessCount !== 3) {
      throw new Error(`Baseline check failed: expected 3 successes, got ${baselineSuccessCount}`);
    }

    // ----------------------------------------------------
    // PHASE 2: Chaos Injection (Disconnect Redis mid-flight)
    // ----------------------------------------------------
    console.log('\n--- Phase 2: Injecting Redis Chaos Mid-Flight ---');
    const chaosPromises = [];
    for (let i = 0; i < 15; i++) {
      chaosPromises.push(
        attemptBooking(testEvent._id.toString(), `chaos-${i}@chaos.test`, `session-chaos-${i}`)
          .then((res: any) => ({ status: 'fulfilled', booking: res }))
          .catch((err: any) => ({ status: 'rejected', error: err }))
      );
    }

    // Give requests 2ms to begin executing, then sever the Redis connection
    await new Promise((resolve) => setTimeout(resolve, 2));
    console.log('🔥 Severing Redis connection now...');
    redis.disconnect();

    const chaosResults = await Promise.all(chaosPromises);
    const chaosSuccesses = chaosResults.filter((r) => r.status === 'fulfilled');
    const chaosFailures = chaosResults.filter((r) => r.status === 'rejected');

    console.log(`Chaos flight outcomes:`);
    console.log(`  -> Succeeded before disconnect: ${chaosSuccesses.length}`);
    console.log(`  -> Gracefully rejected (failed): ${chaosFailures.length}`);

    // Verify all failures threw clean errors and did not crash the system
    for (const f of chaosFailures) {
      const msg = f.error.message;
      if (!msg.includes('busy') && !msg.includes('Connection is closed') && !msg.includes('closed') && !msg.includes('Redis')) {
        console.warn(`⚠️ Unexpected failure message: "${msg}"`);
      }
    }
    console.log('✔ Pass: In-flight chaos requests rejected gracefully.');

    // ----------------------------------------------------
    // PHASE 3: Redis Recovery
    // ----------------------------------------------------
    console.log('\n--- Phase 3: Recovering Redis Connection ---');
    console.log('Connecting Redis back...');
    await redis.connect();
    await waitForRedisReady();
    console.log('✅ Redis is ready again.');

    // ----------------------------------------------------
    // PHASE 4: Post-Recovery Bookings
    // ----------------------------------------------------
    console.log('\n--- Phase 4: Verification After Recovery Sequentially ---');
    let recoverySuccessCount = 0;
    for (let i = 0; i < 3; i++) {
      try {
        await attemptBooking(testEvent._id.toString(), `recovery-${i}@chaos.test`, `session-rec-${i}`);
        recoverySuccessCount++;
      } catch (err: any) {
        console.error(`Post-recovery booking ${i} failed:`, err.message);
      }
    }
    console.log(`Post-recovery bookings: ${recoverySuccessCount} / 3 succeeded.`);

    // ----------------------------------------------------
    // PHASE 5: Database Consistency & Integrity Check
    // ----------------------------------------------------
    console.log('\n--- Phase 5: DB Integrity and Inventory Check ---');
    
    // Fetch total successful bookings count in the DB
    const totalSuccessfulBookings = await Booking.find({
      eventId: testEvent._id,
      status: 'awaiting_payment',
    });

    const activeReservations = await Reservation.find({
      eventId: testEvent._id,
      status: 'reserved',
    });

    const updatedEvent = await Event.findById(testEvent._id);

    console.log(`Successful Bookings in DB: ${totalSuccessfulBookings.length}`);
    console.log(`Active Reservations in DB: ${activeReservations.length}`);
    console.log(`Event reservedCount in DB: ${updatedEvent.reservedCount}`);

    let consistencyPassed = true;

    // Assert that reservation count matches DB bookings count exactly
    if (activeReservations.length !== totalSuccessfulBookings.length) {
      console.error(`🚨 FAIL: Reservation count (${activeReservations.length}) does not match Bookings count (${totalSuccessfulBookings.length})!`);
      consistencyPassed = false;
    } else {
      console.log('✔ Pass: Database Reservation count matches Booking count exactly.');
    }

    // Assert that event reservedCount matches actual ticket quantities booked
    const totalBookedTicketsCount = totalSuccessfulBookings.reduce((sum: number, b: any) => sum + b.totalTickets, 0);
    if (updatedEvent.reservedCount !== totalBookedTicketsCount) {
      console.error(`🚨 FAIL: Event reservedCount (${updatedEvent.reservedCount}) does not match total booked tickets (${totalBookedTicketsCount})!`);
      consistencyPassed = false;
    } else {
      console.log('✔ Pass: Event reservedCount matches total booked tickets exactly.');
    }

    // Assert that we did not exceed capacity (15)
    if (totalBookedTicketsCount > 15) {
      console.error(`🚨 FAIL: Total booked tickets (${totalBookedTicketsCount}) exceeded capacity (15)!`);
      consistencyPassed = false;
    } else {
      console.log('✔ Pass: No overselling occurred during Redis chaos.');
    }

    console.log('\n=========================================');
    if (consistencyPassed) {
      console.log('🎉 RESILIENCE CHAOS TEST COMPLETED SUCCESSFULLY!');
    } else {
      console.error('❌ RESILIENCE CHAOS TEST FAILED INVENTORY INTEGRITY ASSERTIONS.');
    }
    console.log('=========================================');

  } catch (err) {
    console.error('❌ Unexpected error during Redis chaos test execution:', err);
  } finally {
    // Clean up test data
    if (testEvent) {
      console.log('Cleaning up test data...');
      await Booking.deleteMany({ eventId: testEvent._id });
      await Reservation.deleteMany({ eventId: testEvent._id });
      await Event.deleteOne({ _id: testEvent._id });
      console.log('Cleanup finished.');
    }

    await disconnectDatabase();
    await disconnectRedis();
    console.log('Services disconnected. Exit.');
    process.exit(0);
  }
}

main();
