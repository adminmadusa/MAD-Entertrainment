import Razorpay from "razorpay";

import { getEnv } from "./env";

let razorpay: Razorpay | undefined;

export function initRazorpay(): Razorpay | undefined {
  const env = getEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return undefined;
  razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  return razorpay;
}

export function getRazorpay(): Razorpay {
  const instance = razorpay ?? initRazorpay();
  if (!instance) throw new Error("Razorpay is not configured");
  return instance;
}

export function isRazorpayEnabled(): boolean {
  const env = getEnv();
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}
