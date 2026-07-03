import { getRazorpay, isRazorpayEnabled } from '../../config/razorpay';

export class RazorpayAdapter {
  static isEnabled(): boolean {
    return isRazorpayEnabled();
  }

  static async createOrder(params: {
    amountPaise: number;
    currency: string;
    receipt: string;
  }) {
    const rzp = getRazorpay();
    return rzp.orders.create({
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
    });
  }
}
