/*
  Webhook storm generator (Razorpay-style payload)
  Usage:
    BASE_URL=http://localhost:3001 \
    RAZORPAY_WEBHOOK_SECRET=... \
    REQUESTS=1000 CONCURRENCY=25 \
    tsx apps/server/scripts/load/webhook-storm.ts
*/
import crypto from "crypto";

const baseUrl = process.env.BASE_URL || "http://localhost:3001";
const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "dev_secret";
const requests = Number(process.env.REQUESTS || 500);
const concurrency = Number(process.env.CONCURRENCY || 20);
const duplicateRate = Number(process.env.DUPLICATE_RATE || 0.1);

function makePayload(eventId: string, orderId: string, paymentId: string) {
  return JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
        },
      },
    },
    meta: { eventId },
  });
}

function sign(raw: string) {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

async function postOne(i: number) {
  const isDup = Math.random() < duplicateRate && i > 0;
  const eventSeed = isDup ? Math.floor(i / 2) : i;
  const eventId = `evt_storm_${eventSeed}`;
  const orderId = `order_storm_${eventSeed}`;
  const paymentId = `pay_storm_${eventSeed}`;
  const raw = makePayload(eventId, orderId, paymentId);
  const sig = sign(raw);

  const res = await fetch(`${baseUrl}/api/payments/webhook/razorpay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-event-id": eventId,
      "x-razorpay-signature": sig,
    },
    body: raw,
  });
  return res.status;
}

async function run() {
  const started = Date.now();
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < requests; i += concurrency) {
    const chunk = Array.from(
      { length: Math.min(concurrency, requests - i) },
      (_, k) => i + k,
    );
    const results = await Promise.allSettled(chunk.map(postOne));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value >= 200 && r.value < 300) ok++;
      else fail++;
    }
  }

  const durationMs = Date.now() - started;
  const rps = requests / Math.max(durationMs / 1000, 0.001);
  console.log(
    JSON.stringify(
      { requests, concurrency, ok, fail, durationMs, rps },
      null,
      2,
    ),
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
