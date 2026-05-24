import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/server/.env immediately
dotenv.config({ path: path.resolve(process.cwd(), 'apps/server/.env') });

import crypto from 'crypto';

// Set environment for test mode logging overrides if needed
process.env.NODE_ENV = 'test';

// Global references initialized in main()
let connectDatabase: any, disconnectDatabase: any;
let getRedis: any, disconnectRedis: any, waitForRedisReady: any;
let Event: any;
let Booking: any;
let Reservation: any;
let SeatLayout: any;
let PublicBookingService: any;
let BookingMode: any, EventCategory: any, EventStatus: any, TicketTier: any, SeatStatus: any, ReservationStatus: any;
let Types: any;

async function seedGAEvent(capacity: number) {
  const eventId = new Types.ObjectId();
  const event = new Event({
    _id: eventId,
    title: 'Concurrency Test GA Event',
    slug: `concurrency-test-ga-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    description: 'Event for load and concurrency testing',
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

async function seedSeatEvent() {
  const eventId = new Types.ObjectId();
  const event = new Event({
    _id: eventId,
    title: 'Concurrency Test Seat Event',
    slug: `concurrency-test-seat-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    description: 'Event for seat layout concurrency testing',
    category: EventCategory.CONCERT,
    status: EventStatus.PUBLISHED,
    bookingMode: BookingMode.SEAT_BASED,
    bannerImage: { url: 'http://example.com/banner.png', publicId: 'banner' },
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    showTime: '20:00',
    venueId: new Types.ObjectId(),
    ticketTiers: [
      {
        tier: TicketTier.VIP,
        name: 'VIP Seat',
        slug: 'vip-seat',
        price: 500,
        totalCapacity: 1,
        soldCount: 0,
        isActive: true,
        maxPerBooking: 10,
        minPerBooking: 1,
        taxPercent: 18,
      }
    ],
    totalCapacity: 1,
    soldCount: 0,
    reservedCount: 0,
    eventVersion: 1,
  });
  await event.save();

  const seatLayout = new SeatLayout({
    eventId: event._id,
    rows: 1,
    columns: 1,
    sections: [
      {
        name: 'VIP Section',
        rows: ['A'],
        tier: TicketTier.VIP,
      }
    ],
    seats: [
      {
        seatId: 'VIP-A-1',
        row: 'A',
        number: 1,
        section: 'VIP Section',
        status: SeatStatus.AVAILABLE,
        tier: TicketTier.VIP,
        price: 500,
        seatVersion: 1,
      }
    ]
  });
  await seatLayout.save();

  return { event, seatLayout };
}

async function runGATest(userCount: number, capacity: number) {
  console.log(`\n🚀 [Phase 1: General Admission Concurrency]`);
  console.log(`Seeding event with capacity: ${capacity} General Admission tickets...`);
  const event = await seedGAEvent(capacity);
  console.log(`Event created: ${event.title} (ID: ${event._id})`);

  console.log(`Simulating ${userCount} concurrent users requesting 1 ticket each...`);
  
  const promises = [];
  for (let i = 0; i < userCount; i++) {
    const sessionId = crypto.randomUUID();
    const payload = {
      eventId: event._id.toString(),
      guestName: `Concurrent User ${i}`,
      guestEmail: `user${i}@concurrency.test`,
      guestPhone: '9999999999',
      tickets: [
        {
          tier: TicketTier.GENERAL,
          quantity: 1,
        }
      ]
    };

    promises.push(
      PublicBookingService.createBooking(payload, sessionId)
        .then((booking: any) => ({ status: 'fulfilled', booking, sessionId }))
        .catch((error: any) => ({ status: 'rejected', error, sessionId }))
    );
  }

  const startTime = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  console.log(`Finished ${userCount} requests in ${duration}ms.`);

  const successful = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  // Categorize errors
  const errors = rejected.map((r: any) => r.error);
  const lockBusyErrors = errors.filter((e) => e.message?.includes('system is currently busy'));
  const soldOutErrors = errors.filter((e) => e.message?.includes('exceeds remaining capacity') || e.message?.includes('sold out'));
  const otherErrors = errors.filter((e) => !e.message?.includes('system is currently busy') && !e.message?.includes('exceeds remaining capacity') && !e.message?.includes('sold out'));

  console.log(`\n--- Results Analysis ---`);
  console.log(`✅ Successful bookings: ${successful.length}`);
  console.log(`❌ Rejected requests: ${rejected.length}`);
  console.log(`   -> Busy System (Redis Lock contention): ${lockBusyErrors.length}`);
  console.log(`   -> Sold Out / Exceeds Capacity: ${soldOutErrors.length}`);
  console.log(`   -> Other Errors: ${otherErrors.length}`);

  if (otherErrors.length > 0) {
    console.error('⚠️ Unexpected errors found:', otherErrors.map(e => e.message));
  }

  // Database verification
  const bookingsInDb = await Booking.find({ eventId: event._id });
  const activeBookingsInDb = bookingsInDb.filter((b: any) => b.status === 'awaiting_payment');
  const failedBookingsInDb = bookingsInDb.filter((b: any) => b.status === 'failed');
  const reservationsInDb = await Reservation.find({ eventId: event._id });
  const finalEvent = await Event.findById(event._id);

  console.log(`\n--- Database Verification ---`);
  console.log(`Total Bookings in Database: ${bookingsInDb.length}`);
  console.log(`  -> Active (Awaiting Payment): ${activeBookingsInDb.length}`);
  console.log(`  -> Failed: ${failedBookingsInDb.length}`);
  console.log(`Reservations in Database: ${reservationsInDb.length}`);
  console.log(`Event reservedCount in DB: ${finalEvent?.reservedCount}`);
  console.log(`Event soldCount in DB: ${finalEvent?.soldCount}`);

  let verificationPassed = true;

  // Validation 1: No Oversell (Active Bookings must not exceed capacity)
  if (activeBookingsInDb.length > capacity) {
    console.error(`🚨 FAIL: Active Bookings in DB (${activeBookingsInDb.length}) exceeds capacity limit (${capacity})!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Active Bookings in DB does not exceed capacity.`);
  }

  // Validation 2: Active Booking Count matches Successful requests
  if (activeBookingsInDb.length !== successful.length) {
    console.error(`🚨 FAIL: Successful requests count (${successful.length}) does not match Active Bookings in DB (${activeBookingsInDb.length})!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Active Booking count matches successful requests count.`);
  }

  // Validation 3: Reservations count matches Active Bookings count
  if (reservationsInDb.length !== activeBookingsInDb.length) {
    console.error(`🚨 FAIL: Reservations count (${reservationsInDb.length}) does not match Active Bookings count (${activeBookingsInDb.length})!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Reservations count matches active bookings count.`);
  }

  // Validation 4: Event reservedCount in DB equals active reservations
  if (finalEvent?.reservedCount !== reservationsInDb.length) {
    console.error(`🚨 FAIL: Event reservedCount (${finalEvent?.reservedCount}) does not match Reservations count (${reservationsInDb.length})!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Event reservedCount matches active reservations.`);
  }

  // Validation 5: Failed bookings in DB matches rejected requests count
  if (failedBookingsInDb.length !== rejected.length) {
    console.error(`🚨 FAIL: Failed bookings count in DB (${failedBookingsInDb.length}) does not match rejected requests count (${rejected.length})!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Failed bookings count in DB matches rejected requests count.`);
  }


  // Clean up seeded data
  await Booking.deleteMany({ eventId: event._id });
  await Reservation.deleteMany({ eventId: event._id });
  await Event.deleteOne({ _id: event._id });
  console.log(`Seeded General Admission test data cleaned up.`);

  return verificationPassed;
}

async function runSeatTest(userCount: number) {
  console.log(`\n🚀 [Phase 2: Seat-Based Concurrency]`);
  console.log(`Seeding event with a single VIP seat ("VIP-A-1")...`);
  const { event, seatLayout } = await seedSeatEvent();
  console.log(`Event created: ${event.title} (ID: ${event._id})`);

  console.log(`1. Testing Redis Seat Lock Contention...`);
  const redis = getRedis();
  const seatId = 'VIP-A-1';
  const lockKey = `mad:lock:event:${event._id}:seat:${seatId}`;

  const lockPromises = [];
  const sessionIds: string[] = [];
  for (let i = 0; i < userCount; i++) {
    const sessionId = crypto.randomUUID();
    sessionIds.push(sessionId);
    lockPromises.push(
      redis.set(lockKey, sessionId, 'EX', 5, 'NX')
        .then((res: any) => ({ sessionId, success: res === 'OK' }))
    );
  }

  const lockResults = await Promise.all(lockPromises);
  const successfulLocks = lockResults.filter((r) => r.success);
  console.log(`Lock results: ${successfulLocks.length} user(s) successfully acquired the Redis seat lock.`);
  
  if (successfulLocks.length !== 1) {
    console.error(`🚨 FAIL: Expected exactly 1 user to acquire the Redis lock, but got ${successfulLocks.length}!`);
  } else {
    console.log(`✔ Pass: Exactly 1 user acquired the lock. Lock Owner: ${successfulLocks[0].sessionId}`);
  }

  // Clear redis seat lock
  await redis.del(lockKey);

  console.log(`\n2. Testing MongoDB Seat Double-Booking Prevention...`);
  console.log(`Simulating race condition where ${userCount} concurrent requests attempt to reserve the same seat...`);
  console.log(`(Bypassing Redis lock check by writing the correct session ID in Redis for each user prior to checkout)`);

  const bookingPromises = [];
  for (let i = 0; i < userCount; i++) {
    const sessionId = sessionIds[i];
    const payload = {
      eventId: event._id.toString(),
      guestName: `Seat User ${i}`,
      guestEmail: `seat${i}@concurrency.test`,
      guestPhone: '9999999999',
      tickets: [
        {
          tier: TicketTier.VIP,
          quantity: 1,
          seats: [
            {
              seatId: 'VIP-A-1',
              row: 'A',
              number: 1,
              section: 'VIP Section',
            }
          ]
        }
      ]
    };

    bookingPromises.push(
      async () => {
        // Explicitly set the Redis seat lock for this session right before calling createBooking
        // This ensures the request passes the Redis validation layer and hits Mongoose update concurrency directly
        await redis.set(lockKey, sessionId, 'EX', 5);
        return PublicBookingService.createBooking(payload, sessionId)
          .then((booking: any) => ({ status: 'fulfilled', booking, sessionId }))
          .catch((error: any) => ({ status: 'rejected', error, sessionId }));
      }
    );
  }

  // Fire requests as close to simultaneously as possible
  const startTime = Date.now();
  const results = await Promise.all(bookingPromises.map(fn => fn()));
  const duration = Date.now() - startTime;

  console.log(`Finished ${userCount} seat booking requests in ${duration}ms.`);

  const successfulBookings = results.filter((r) => r.status === 'fulfilled');
  const rejectedBookings = results.filter((r) => r.status === 'rejected');

  console.log(`\n--- Seat Results Analysis ---`);
  console.log(`✅ Successful seat bookings: ${successfulBookings.length}`);
  console.log(`❌ Rejected seat bookings: ${rejectedBookings.length}`);

  const uniqueErrors = Array.from(new Set(rejectedBookings.map((r: any) => r.error?.message || r.error?.stack || String(r.error))));
  console.log(`   -> Unique error messages observed:`, uniqueErrors);

  const conflictErrors = rejectedBookings.filter((r: any) => 
    r.error?.message?.includes('locked by another user') || 
    r.error?.message?.includes('no longer available') || 
    r.error?.message?.includes('conflict') ||
    r.error?.message?.includes('E11000') ||
    r.error?.stack?.includes('E11000') ||
    r.error?.message?.includes('not locked by your session') // session overwritten in race condition
  );
  console.log(`   -> Seat Contention / Double-booking Blocked (Redis/Mongo layers): ${conflictErrors.length}`);
  console.log(`   -> Unclassified Errors: ${rejectedBookings.length - conflictErrors.length}`);


  // Database verification
  const bookingsInDb = await Booking.find({ eventId: event._id });
  const reservationsInDb = await Reservation.find({ eventId: event._id });
  const finalSeatLayout = await SeatLayout.findOne({ eventId: event._id });
  const finalEvent = await Event.findById(event._id);

  console.log(`\n--- Seat Database Verification ---`);
  console.log(`Bookings in Database: ${bookingsInDb.length}`);
  console.log(`Reservations in Database: ${reservationsInDb.length}`);
  console.log(`Seat Status in DB: ${finalSeatLayout?.seats[0]?.status}`);
  console.log(`Seat BookedByBookingId: ${finalSeatLayout?.seats[0]?.bookedByBookingId}`);
  console.log(`Event reservedCount in DB: ${finalEvent?.reservedCount}`);

  let verificationPassed = true;

  // Validation 1: Exactly 1 seat booking succeeded
  if (successfulBookings.length !== 1) {
    console.error(`🚨 FAIL: Expected exactly 1 successful booking, but got ${successfulBookings.length}!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Exactly 1 booking was created.`);
  }

  // Validation 2: Seat Status is LOCKED
  if (finalSeatLayout?.seats[0]?.status !== SeatStatus.LOCKED) {
    console.error(`🚨 FAIL: Seat status in layout is "${finalSeatLayout?.seats[0]?.status}", expected "LOCKED"!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Seat is correctly marked as LOCKED.`);
  }

  // Validation 3: Seat points to the correct booking ID
  const successBookingId = successfulBookings[0]?.booking?._id?.toString();
  if (finalSeatLayout?.seats[0]?.bookedByBookingId !== successBookingId) {
    console.error(`🚨 FAIL: Seat bookedByBookingId (${finalSeatLayout?.seats[0]?.bookedByBookingId}) does not match successful booking ID (${successBookingId})!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Seat points to the successful booking ID.`);
  }

  // Validation 4: Exactly 1 reservation exists
  if (reservationsInDb.length !== 1) {
    console.error(`🚨 FAIL: Expected exactly 1 reservation in DB, but found ${reservationsInDb.length}!`);
    verificationPassed = false;
  } else {
    console.log(`✔ Pass: Exactly 1 reservation was created.`);
  }

  // Clean up
  await Booking.deleteMany({ eventId: event._id });
  await Reservation.deleteMany({ eventId: event._id });
  await SeatLayout.deleteOne({ eventId: event._id });
  await Event.deleteOne({ _id: event._id });
  await redis.del(lockKey);
  console.log(`Seeded Seat-based test data cleaned up.`);

  return verificationPassed;
}

async function main() {
  // Dynamically load dependencies inside main to bypass CJS top-level await limitations
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
  SeatLayout = (await import('../apps/server/src/models/seat-layout.schema')).SeatLayout;
  PublicBookingService = (await import('../apps/server/src/services/public/booking.service')).PublicBookingService;

  const shared = await import('@mad/shared');
  BookingMode = shared.BookingMode;
  EventCategory = shared.EventCategory;
  EventStatus = shared.EventStatus;
  TicketTier = shared.TicketTier;
  SeatStatus = shared.SeatStatus;
  ReservationStatus = shared.ReservationStatus;

  Types = (await import('mongoose')).Types;

  console.log('--- Starting Concurrency & Load Simulation ---');
  
  try {
    // 1. Connect to services
    await connectDatabase();
    await waitForRedisReady();
    console.log('✅ Services connected successfully.');

    // 2. Run General Admission Test: 100 users, 5 capacity
    const gaPassed = await runGATest(100, 5);

    // 3. Run Seat-based Test: 100 users, 1 seat
    const seatPassed = await runSeatTest(100);

    console.log('\n=========================================');
    if (gaPassed && seatPassed) {
      console.log('🎉 ALL CONCURRENCY AND RESILIENCY CHECKS PASSED SUCCESSFULLY!');
    } else {
      console.error('❌ SOME CONCURRENCY CHECKS FAILED. PLEASE AUDIT LOGS.');
    }
    console.log('=========================================');

  } catch (err) {
    console.error('❌ Error during simulation execution:', err);
  } finally {
    await disconnectDatabase();
    await disconnectRedis();
    console.log('Services disconnected. Exit.');
    process.exit(0);
  }
}

main();
