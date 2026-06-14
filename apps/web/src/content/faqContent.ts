export type FAQCategory = 'tickets' | 'payments' | 'refunds' | 'events' | 'accounts';

export interface FAQ {
  id: string;
  category: FAQCategory;
  question: string;
  answer: string;
}

export const faqContent: FAQ[] = [
  // TICKETS & ENTRY
  {
    id: 't1',
    category: 'tickets',
    question: "I didn't receive my ticket email. What should I do?",
    answer: "First, check your spam or junk folder. If it's still missing, you can instantly retrieve your ticket by visiting the <a href='/tickets' class='text-accent-purple hover:underline'>My Tickets</a> page and entering your booking email address."
  },
  {
    id: 't2',
    category: 'tickets',
    question: "Can I show the QR code on my phone, or do I need to print it?",
    answer: "You do not need to print your ticket. You can present the QR code directly from your smartphone at the venue entrance. Just ensure your screen brightness is turned up."
  },
  {
    id: 't3',
    category: 'tickets',
    question: "How do I download my ticket as a PDF?",
    answer: "Log into the <a href='/tickets' class='text-accent-purple hover:underline'>My Tickets</a> page, select your booking, and click the 'Download PDF' button next to your entry passes."
  },
  {
    id: 't4',
    category: 'tickets',
    question: "Can I transfer or resell my ticket to a friend?",
    answer: "Tickets are non-transferable and must match the name of the purchaser or the assigned guest. Resale of tickets is strictly prohibited. Please see our <a href='/legal/ticketing' class='text-accent-purple hover:underline'>Ticketing Policy</a> for more details."
  },
  {
    id: 't5',
    category: 'tickets',
    question: "My ticket says 'Guest Checkout' — how do I log in?",
    answer: "If you checked out as a guest, your tickets are tied to the email address you used during purchase. Simply enter that email on the <a href='/tickets' class='text-accent-purple hover:underline'>My Tickets</a> page to access them."
  },

  // PAYMENTS & BILLING
  {
    id: 'p1',
    category: 'payments',
    question: "My payment failed but money was deducted. What happens next?",
    answer: "Don't panic! If a payment fails but funds were deducted, the transaction will automatically reverse. Your bank will credit the amount back to your account within 5-7 business days."
  },
  {
    id: 'p2',
    category: 'payments',
    question: "I was charged twice for the same booking. How do I get a refund?",
    answer: "Duplicate charges are usually a result of bank processing delays. Please use our <a href='/contact' class='text-accent-purple hover:underline'>Contact Form</a> and provide your Transaction ID so we can issue an immediate refund for the duplicate charge."
  },
  {
    id: 'p3',
    category: 'payments',
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards, UPI, and select digital wallets through our secure payment partners, Razorpay and Stripe."
  },
  {
    id: 'p4',
    category: 'payments',
    question: "How long do pending payments take to resolve?",
    answer: "Pending payments typically resolve within 15-30 minutes. If your booking is still marked as 'Pending' after an hour, please contact support."
  },
  {
    id: 'p5',
    category: 'payments',
    question: "Where can I find my invoice or receipt?",
    answer: "A digital receipt is included in your booking confirmation email. You can also download a formal invoice directly from your <a href='/tickets' class='text-accent-purple hover:underline'>Ticket Dashboard</a>."
  },

  // REFUNDS & CANCELLATIONS
  {
    id: 'r1',
    category: 'refunds',
    question: "Can I cancel my ticket and get a refund?",
    answer: "Refund eligibility depends on the specific event. In general, tickets are non-refundable unless the event is canceled. Please refer to our <a href='/legal/refunds' class='text-accent-purple hover:underline'>Refund Policy</a>."
  },
  {
    id: 'r2',
    category: 'refunds',
    question: "What happens if an event is canceled or postponed?",
    answer: "If an event is canceled, you will automatically receive a full refund to your original payment method. If postponed, your ticket will remain valid for the new date, or you may request a refund."
  },
  {
    id: 'r3',
    category: 'refunds',
    question: "How long does a refund take to process?",
    answer: "Once approved, refunds take 5-7 business days to reflect in your bank account or credit card statement, depending on your financial institution."
  },

  // EVENTS & VENUES
  {
    id: 'e1',
    category: 'events',
    question: "What are the age restrictions for your events?",
    answer: "Age restrictions vary by event (typically 18+ or 21+). The specific age requirement is clearly listed on the event's booking page. Valid ID is required at the door."
  },
  {
    id: 'e2',
    category: 'events',
    question: "Is there a dress code for MAD Entertainment events?",
    answer: "Most of our nightlife and DJ events enforce a smart-casual dress code. Open-toed shoes for men, athletic wear, and overly casual attire may be restricted by the venue."
  },
  {
    id: 'e3',
    category: 'events',
    question: "What items are prohibited at the venue?",
    answer: "Outside food and beverages, professional cameras, large bags, and illegal substances are strictly prohibited. Venue security will conduct standard bag checks."
  },
  {
    id: 'e4',
    category: 'events',
    question: "What time do the doors open and close?",
    answer: "Door times are listed on your ticket and the event page. We strongly recommend arriving early to avoid long queues."
  },

  // ACCOUNTS & SECURITY
  {
    id: 'a1',
    category: 'accounts',
    question: "I haven't received my login OTP. What should I do?",
    answer: "Please wait up to 2 minutes and check your spam folder. If the OTP still hasn't arrived, you can click 'Resend OTP' on the login screen."
  },
  {
    id: 'a2',
    category: 'accounts',
    question: "Can I change the email address linked to my tickets?",
    answer: "For security reasons, we cannot change the email address associated with a completed booking. If you lost access to your email, please <a href='/contact' class='text-accent-purple hover:underline'>contact support</a> with your Booking Reference."
  },
  {
    id: 'a3',
    category: 'accounts',
    question: "How do I delete my account data?",
    answer: "You can request full data deletion by reviewing our <a href='/legal/data-deletion' class='text-accent-purple hover:underline'>Data Deletion Policy</a> and submitting a formal request to our privacy team."
  }
];
