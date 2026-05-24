import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../apps/server/.env') });

async function run() {
  console.log('🏁 Starting payment gateways test...');
  console.log('Env keys loaded:');
  console.log('  RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
  console.log('  RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '***' : 'missing');

  const { initRazorpay, getRazorpay } = await import('../apps/server/src/config/razorpay');
  try {
    initRazorpay();
    const rzp = getRazorpay();
    console.log('Attempting order creation with Razorpay...');
    const order = await rzp.orders.create({
      amount: 50000, // INR 500.00
      currency: 'INR',
      receipt: 'test_receipt_123',
    });
    console.log('✅ Razorpay order created successfully:', order);
  } catch (err: any) {
    console.error('❌ Razorpay order creation failed:');
    console.error('Error properties:', JSON.stringify(err, null, 2));
    console.error('Error message:', err.message);
  }
}

run().catch(console.error);
