import Stripe from "stripe";

import { getEnv } from "./env";

let stripe: Stripe | undefined;

export function initStripe(): Stripe | undefined {
  const key = getEnv().STRIPE_SECRET_KEY;
  if (!key) return undefined;
  stripe = new Stripe(key);
  return stripe;
}

export function getStripe(): Stripe {
  const instance = stripe ?? initStripe();
  if (!instance) throw new Error("Stripe is not configured");
  return instance;
}

export function isStripeEnabled(): boolean {
  return Boolean(getEnv().STRIPE_SECRET_KEY);
}
