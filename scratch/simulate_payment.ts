import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment configuration
dotenv.config({ path: path.join(__dirname, '../apps/server/.env') });

async function run() {
  console.log('🏁 Starting payment verification simulation...');

  // Dynamically import required config, models, and services
  const { connectDatabase, disconnectDatabase } = await import('../apps/server/src/config/database');
  const { Booking } = await import('../apps/server/src/models/booking.schema');
  const { Payment } = await import('../apps/server/src/models/payment.schema');
  const { PaymentService } = await import('../apps/server/src/services/public/payment.service');
  const { getRazorpay, initRazorpay } = await import('../apps/server/src/config/razorpay');
  const { BookingStatus, PaymentStatus } = await import('@mad/shared');

  // 1. Connect to MongoDB Atlas
  console.log('Connecting to MongoDB Atlas...');
  await connectDatabase();
  initRazorpay();

  try {
    // 2. Find the most recent booking awaiting payment
    console.log('Looking for a booking awaiting payment...');
    const booking = await Booking.findOne({ status: BookingStatus.AWAITING_PAYMENT }).sort({ createdAt: -1 });

    if (!booking) {
      console.warn('⚠️ No active booking with status "AWAITING_PAYMENT" found in the database.');
      console.log('Please create a checkout booking on the website first, then run this script again!');
      return;
    }

    console.log(`Found booking: ID=${booking._id}, Ref=${booking.bookingId}, Amount=INR ${booking.totalAmount}`);

    // 3. Create a real Razorpay order on their live servers
    console.log('Creating a live order on Razorpay servers...');
    const amountPaise = Math.round(booking.totalAmount * 100);
    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: booking.bookingId,
    });

    console.log(`✅ Live order created on Razorpay: ID=${order.id}`);

    // 4. Create a pending Payment document in the database
    console.log('Creating pending payment document...');
    const payment = await Payment.create({
      bookingId: booking._id,
      gateway: 'razorpay',
      status: PaymentStatus.PENDING,
      amount: booking.totalAmount,
      currency: 'INR',
      gatewayOrderId: order.id,
    });

    booking.paymentId = payment._id as any;
    await booking.save();

    // 5. Generate a mathematically perfect Razorpay Signature
    console.log('Computing cryptographic HMAC-SHA256 signature...');
    const dummyPaymentId = 'pay_simulated_' + Math.random().toString(36).substring(2, 10);
    const signatureText = order.id + '|' + dummyPaymentId;
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(signatureText)
      .digest('hex');

    console.log(`Generated payment payload:`);
    console.log(`  razorpay_order_id: ${order.id}`);
    console.log(`  razorpay_payment_id: ${dummyPaymentId}`);
    console.log(`  razorpay_signature: ${signature}`);

    // 6. Execute verifyPayment service
    console.log('Executing live verifyPayment flow...');
    const updatedBooking = await PaymentService.verifyPayment(booking._id.toString(), {
      razorpay_order_id: order.id,
      razorpay_payment_id: dummyPaymentId,
      razorpay_signature: signature,
    });

    console.log('\n=============================================');
    console.log('🎉 SIMULATION SUCCESSFUL!');
    console.log(`Booking Status updated to: ${updatedBooking.status}`);
    
    // Check if tickets were created in database
    const { Ticket } = await import('../apps/server/src/models/ticket.schema');
    const tickets = await Ticket.find({ bookingId: booking._id });
    console.log(`Scan-ready tickets generated: ${tickets.length}`);
    for (const t of tickets) {
      console.log(`  - Ticket ID: ${t.ticketId}, QR Code: ${t.qrCodeImage.substring(0, 60)}...`);
    }
    console.log('=============================================');

  } catch (err: any) {
    console.error('❌ Simulation failed:', err.message || err);
    if (err.stack) console.error(err.stack);
  } finally {
    console.log('Disconnecting from database...');
    await disconnectDatabase();
  }
}

run().catch(console.error);
