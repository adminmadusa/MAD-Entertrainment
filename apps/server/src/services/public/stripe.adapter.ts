import { getStripe, isStripeEnabled } from '../../config/stripe';
import { getEnv } from '../../config/env';

export class StripeAdapter {
  static isEnabled(): boolean {
    return isStripeEnabled();
  }

  static async createPaymentIntent(params: {
    amountPaise: number;
    currency: string;
    bookingId: string;
    bookingReference: string;
  }) {
    const stripe = getStripe();
    return stripe.paymentIntents.create({
      amount: params.amountPaise,
      currency: params.currency.toLowerCase(),
      metadata: {
        bookingId: params.bookingId,
        bookingReference: params.bookingReference,
        environment: getEnv().NODE_ENV,
      },
    });
  }

  static async retrievePaymentIntent(intentId: string) {
    const stripe = getStripe();
    return stripe.paymentIntents.retrieve(intentId);
  }
}
