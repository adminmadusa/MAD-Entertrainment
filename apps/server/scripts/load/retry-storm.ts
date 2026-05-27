/*
  Seeds failing outbox events for retry pressure simulation.
  Usage:
    MONGODB_URI=... COUNT=1000 tsx apps/server/scripts/load/retry-storm.ts
*/
import mongoose from "mongoose";
import "../../src/models";
import { OutboxEvent } from "../../src/models/outbox-event.schema";

const uri = process.env.MONGODB_URI;
const count = Number(process.env.COUNT || 1000);

if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  const now = new Date();
  const docs = Array.from({ length: count }, (_, i) => ({
    aggregateType: "benchmark",
    aggregateId: `retry_${i}`,
    eventType: "EMAIL_REQUESTED",
    payloadVersion: 1,
    payload: { bookingId: `fffffffffffffffffffffff${String(i % 10)}` },
    status: "FAILED",
    attempts: 2,
    maxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS || 8),
    availableAt: now,
    deadLetterEligible: false,
    lastError: "seeded retry storm",
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
