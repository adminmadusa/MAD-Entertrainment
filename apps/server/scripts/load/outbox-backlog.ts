/*
  Seeds outbox backlog directly in Mongo for dispatcher throughput tests.
  Usage:
    MONGODB_URI=... COUNT=5000 tsx apps/server/scripts/load/outbox-backlog.ts
*/
import mongoose from 'mongoose';
import '../../src/models';
import { OutboxEvent } from '../../src/models/outbox-event.schema';

const uri = process.env.MONGODB_URI;
const count = Number(process.env.COUNT || 5000);

if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  const now = new Date();
  const docs = Array.from({ length: count }, (_, i) => ({
    aggregateType: 'benchmark',
    aggregateId: `benchmark_${i}`,
    eventType: 'SOCKET_EVENT',
    payloadVersion: 1,
    payload: {
      channel: 'admin',
      room: 'analytics',
      event: 'analytics:changed',
      correlationId: `bench_${i}`,
      data: { index: i, generatedAt: now.toISOString() },
    },
    status: 'PENDING',
    attempts: 0,
    maxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS || 8),
    availableAt: now,
    deadLetterEligible: false,
  }));

  const result = await OutboxEvent.insertMany(docs, { ordered: false });
  console.log(JSON.stringify({ inserted: result.length }, null, 2));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
