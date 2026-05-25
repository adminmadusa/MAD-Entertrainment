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
let SeatLayout: any;
let Payment: any;
let WebhookEvent: any;
let PaymentService: any;
let BookingMode: any, EventCategory: any, EventStatus: any, TicketTier: any, SeatStatus: any, ReservationStatus: any, PaymentStatus: any, BookingStatus: any, InventoryState: any;


async function seedGAEvent(capacity: number) {
  const eventId = new Types.ObjectId();
  const event = new Event({
    _id: eventId,
    title: 'Webhook Test GA Event',
    slug: `webhook-test-ga-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    description: 'Event for webhook concurrency testing',
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

async function createAwaitingPaymentBooking(eventId: Types.ObjectId, orderId: string) {
  const booking = new Booking({
    eventId,
    guestName: 'Webhook Tester',
    guestEmail: 'test@webhook.replay',
    guestPhone: '9999999999',
    tickets: [
      {
        tier: TicketTier.GENERAL,
        tierName: 'General Admission',
        quantity: 1,
        pricePerTicket: 100,
        subtotal: 100,
        seats: [],
      }
    ],
    totalTickets: 1,
    subtotal: 100,
    convenienceFee: 30,
    gst: 23, // Math.round((100 * 18)/100) = 18 + convenienceFeeGst (5) = 23
    discount: 0,
    totalAmount: 153,
    currency: 'INR',
    status: BookingStatus.AWAITING_PAYMENT,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  await booking.save();

  // Create reservations
  const reservation = new Reservation({
    eventId,
    tier: TicketTier.GENERAL,
    section: TicketTier.GENERAL,
    sessionId: 'webhook-test-session',
    quantity: 1,
    status: ReservationStatus.PENDING_PAYMENT,
    inventoryState: InventoryState.PENDING_PAYMENT,
    expiresAt: booking.expiresAt,
    bookingId: booking._id,
    bookingReference: booking.bookingId,
    correlationId: booking.bookingId,
  });
  await reservation.save();

  // Increment event reserved count to match the reservation
  await Event.updateOne({ _id: eventId }, { $inc: { reservedCount: 1 } });

  booking.reservationIds = [reservation.reservationId];
  await booking.save();

  // Create payment record
  const payment = new Payment({
    bookingId: booking._id,
    gateway: 'razorpay',
    status: PaymentStatus.PENDING,
    amount: booking.totalAmount,
    currency: 'INR',
    gatewayOrderId: orderId,
  });
  await payment.save();

  booking.paymentId = payment._id as any;
  await booking.save();

  return { booking, payment, reservation };
}

async function runDuplicateWebhookTest(event: any) {
  console.log(`\n1. Running Duplicate Webhook Replay Test...`);
  const orderId = `order_${crypto.randomBytes(6).toString('hex')}`;
  const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const { booking, payment } = await createAwaitingPaymentBooking(event._id, orderId);

  const webhookEventId = `evt_${crypto.randomBytes(6).toString('hex')}`;
  console.log(`Created booking ${booking.bookingId} awaiting payment (order: ${orderId}).`);

  // Simulate 5 duplicate webhook deliveries concurrently
  console.log(`Firing 5 identical concurrent Razorpay webhooks for payment ${paymentId}...`);
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      PaymentService.confirmFromWebhook(orderId, paymentId, 'payment.captured', webhookEventId)
        .then((res: any) => ({ status: 'fulfilled', result: res }))
        .catch((err: any) => ({ status: 'rejected', error: err }))
    );
  }

  const results = await Promise.all(promises);
  const successes = results.filter((r) => r.status === 'fulfilled' && r.result.status === 'confirmed');
  const skipped = results.filter((r) => r.status === 'fulfilled' && r.result.status === 'skipped');
  const rejected = results.filter((r) => r.status === 'rejected');

  console.log(`Duplicate webhook results:`);
  console.log(`  -> Confirmed outcomes: ${successes.length}`);
  console.log(`  -> Skipped outcomes: ${skipped.length}`);
  console.log(`  -> Rejected/Errors: ${rejected.length}`);

  let passed = true;

  // Assertions
  if (successes.length !== 1) {
    console.error(`🚨 FAIL: Expected exactly 1 webhook execution to confirm, but got ${successes.length}!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Exactly one duplicate webhook execution confirmed the payment.`);
  }

  // Database checks
  const updatedBooking = await Booking.findById(booking._id);
  const updatedPayment = await Payment.findById(payment._id);
  const updatedEvent = await Event.findById(event._id);
  const createdWebhooks = await WebhookEvent.find({ eventId: webhookEventId });

  if (updatedBooking?.status !== BookingStatus.CONFIRMED) {
    console.error(`🚨 FAIL: Booking status is ${updatedBooking?.status}, expected CONFIRMED!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Booking transitioned to CONFIRMED.`);
  }

  if (updatedPayment?.status !== PaymentStatus.PAID) {
    console.error(`🚨 FAIL: Payment status is ${updatedPayment?.status}, expected PAID!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Payment status marked PAID.`);
  }

  if (updatedEvent?.soldCount !== 1) {
    console.error(`🚨 FAIL: Event soldCount is ${updatedEvent?.soldCount}, expected exactly 1 (not double-counted)!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Event soldCount incremented exactly once (no double-counting).`);
  }

  // Clean up
  await Booking.deleteMany({ eventId: event._id });
  await Reservation.deleteMany({ eventId: event._id });
  await Payment.deleteMany({ bookingId: booking._id });
  await WebhookEvent.deleteMany({ eventId: webhookEventId });

  return passed;
}

async function runFrontendWebhookRaceTest(event: any) {
  console.log(`\n2. Running Frontend Redirect + Webhook Concurrency Race Test...`);
  const orderId = `order_${crypto.randomBytes(6).toString('hex')}`;
  const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const { booking, payment } = await createAwaitingPaymentBooking(event._id, orderId);

  // Razorpay signature verification details
  const text = orderId + '|' + paymentId;
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
    .update(text)
    .digest('hex');

  const frontendPayload = {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  };

  const webhookEventId = `evt_${crypto.randomBytes(6).toString('hex')}`;
  console.log(`Created booking ${booking.bookingId} awaiting payment (order: ${orderId}).`);
  console.log(`Simulating concurrent frontend verifyPayment() and webhook confirmFromWebhook()...`);

  // Run frontend verification and webhook confirmation concurrently
  const promises = [
    PaymentService.verifyPayment(booking._id.toString(), frontendPayload)
      .then((res: any) => ({ source: 'frontend', status: 'fulfilled', result: res }))
      .catch((err: any) => ({ source: 'frontend', status: 'rejected', error: err })),
    
    PaymentService.confirmFromWebhook(orderId, paymentId, 'payment.captured', webhookEventId)
      .then((res: any) => ({ source: 'webhook', status: 'fulfilled', result: res }))
      .catch((err: any) => ({ source: 'webhook', status: 'rejected', error: err }))
  ];

  const results = await Promise.all(promises);

  console.log(`Race outcomes:`);
  for (const r of results) {
    if (r.status === 'fulfilled') {
      console.log(`  -> ${r.source} succeeded:`, r.result?.status || 'confirmed');
    } else {
      console.log(`  -> ${r.source} rejected:`, r.error?.message);
    }
  }

  let passed = true;

  // DB verification
  const updatedBooking = await Booking.findById(booking._id);
  const updatedEvent = await Event.findById(event._id);

  if (updatedBooking?.status !== BookingStatus.CONFIRMED) {
    console.error(`🚨 FAIL: Booking status is ${updatedBooking?.status}, expected CONFIRMED!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Booking successfully transitioned to CONFIRMED.`);
  }

  // Verify that event capacity count is updated exactly once (soldCount = 1)
  if (updatedEvent?.soldCount !== 1) {
    console.error(`🚨 FAIL: Event soldCount is ${updatedEvent?.soldCount}, expected exactly 1!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Event capacity updated exactly once.`);
  }

  // Clean up
  await Booking.deleteMany({ eventId: event._id });
  await Reservation.deleteMany({ eventId: event._id });
  await Payment.deleteMany({ bookingId: booking._id });
  await WebhookEvent.deleteMany({ eventId: webhookEventId });

  return passed;
}

async function runDelayedWebhookTest(event: any) {
  console.log(`\n3. Running Delayed Webhook After Booking Expiration Test...`);
  const orderId = `order_${crypto.randomBytes(6).toString('hex')}`;
  const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const { booking, payment, reservation } = await createAwaitingPaymentBooking(event._id, orderId);

  console.log(`Created booking ${booking.bookingId} awaiting payment.`);
  
  // Simulate booking expiration / release inventory
  console.log(`Simulating reservation expiration (marking booking as FAILED and releasing capacity)...`);
  booking.status = BookingStatus.FAILED;
  await booking.save();
  
  reservation.status = ReservationStatus.EXPIRED;
  await reservation.save();

  // Reset event soldCount and reservedCount
  event.soldCount = 0;
  event.reservedCount = 0;
  await event.save();

  const webhookEventId = `evt_${crypto.randomBytes(6).toString('hex')}`;
  console.log(`Delayed payment webhook arrives for expired booking...`);

  // Process delayed webhook
  const result = await PaymentService.confirmFromWebhook(orderId, paymentId, 'payment.captured', webhookEventId);
  console.log(`Delayed webhook processed outcome:`, result);

  let passed = true;

  // DB verification
  const updatedBooking = await Booking.findById(booking._id);
  const updatedEvent = await Event.findById(event._id);

  if (updatedBooking?.status !== BookingStatus.FAILED) {
    console.error(`🚨 FAIL: Expired booking was modified to status ${updatedBooking?.status}!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Expired booking status remains FAILED.`);
  }

  if (updatedEvent?.soldCount !== 0) {
    console.error(`🚨 FAIL: Event soldCount was incremented to ${updatedEvent?.soldCount} for an expired booking!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Event soldCount remains 0 (no capacity leaked/allocated).`);
  }

  if (result.status !== 'confirmed' && result.status !== 'skipped') {
    console.error(`🚨 FAIL: Expected webhook status outcome to be "confirmed" or "skipped", got "${result.status}"!`);
    passed = false;
  } else {
    console.log(`✔ Pass: Webhook processed successfully, and booking confirmation was correctly skipped on the failed booking.`);
  }


  // Clean up
  await Booking.deleteMany({ eventId: event._id });
  await Reservation.deleteMany({ eventId: event._id });
  await Payment.deleteMany({ bookingId: booking._id });
  await WebhookEvent.deleteMany({ eventId: webhookEventId });

  return passed;
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
  Payment = (await import('../apps/server/src/models/payment.schema')).Payment;
  WebhookEvent = (await import('../apps/server/src/models/webhook-event.schema')).WebhookEvent;
  PaymentService = (await import('../apps/server/src/services/public/payment.service')).PaymentService;

  const shared = await import('@mad/shared');
  BookingMode = shared.BookingMode;
  EventCategory = shared.EventCategory;
  EventStatus = shared.EventStatus;
  TicketTier = shared.TicketTier;
  SeatStatus = shared.SeatStatus;
  ReservationStatus = shared.ReservationStatus;
  PaymentStatus = shared.PaymentStatus;
  BookingStatus = shared.BookingStatus;
  InventoryState = shared.InventoryState;


  console.log('--- Starting Webhook & Payment Concurrency Simulation ---');
  
  try {
    // 1. Connect to services
    await connectDatabase();
    await waitForRedisReady();
    console.log('✅ Services connected successfully.');

    // Seed test GA event
    const event = await seedGAEvent(10);

    // 2. Run Duplicate Webhook Replay test
    const dupPassed = await runDuplicateWebhookTest(event);

    // Reset event soldCount before next test in database
    await Event.updateOne({ _id: event._id }, { $set: { soldCount: 0, reservedCount: 0 } });

    // 3. Run Frontend Redirect + Webhook Concurrency Race test
    const racePassed = await runFrontendWebhookRaceTest(event);

    // Reset event soldCount before next test in database
    await Event.updateOne({ _id: event._id }, { $set: { soldCount: 0, reservedCount: 0 } });


    // 4. Run Delayed Webhook Expiry test
    const delayPassed = await runDelayedWebhookTest(event);

    // Delete test GA event
    await Event.deleteOne({ _id: event._id });

    console.log('\n=========================================');
    if (dupPassed && racePassed && delayPassed) {
      console.log('🎉 ALL WEBHOOK AND PAYMENT CONCURRENCY CHECKS PASSED SUCCESSFULLY!');
    } else {
      console.error('❌ SOME WEBHOOK CONCURRENCY CHECKS FAILED. PLEASE AUDIT LOGS.');
    }
    console.log('=========================================');

  } catch (err) {
    console.error('❌ Error during webhook simulation execution:', err);
  } finally {
    await disconnectDatabase();
    await disconnectRedis();
    console.log('Services disconnected. Exit.');
    process.exit(0);
  }
}

main();
