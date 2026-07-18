'use client';

import Link from 'next/link';

const TOP_FAQS = [
  {
    q: 'How do I access my tickets?',
    a: "All active tickets are displayed under the 'My Tickets' tab. Simply tap any event row to expand it, view the entry pass QR codes, or download the PDF.",
  },
  {
    q: 'Can I get a refund for my booking?',
    a: "Refund eligibility depends on the specific event policy. In general, tickets are non-refundable unless the event is cancelled. Please check the event page or refer to our <a href='/legal/refunds' class='text-accent-purple hover:underline font-semibold'>Refund Policy</a>.",
  },
  {
    q: "What if I didn't receive my confirmation email?",
    a: "Ensure you are logged in with the same email used during purchase. Expand the event row under 'My Tickets' and click 'Resend Email' to trigger a manual dispatch.",
  },
];

export function DashboardSupportTab() {
  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden">
        <h2 className="text-white font-bold text-xl">Need Assistance?</h2>
        <p className="text-text-secondary text-sm max-w-lg">
          Have questions about your booking, payment queries, or event logistics? Check out our quick answers below or contact our team directly.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <Link
            href="/contact?from=dashboard"
            className="px-6 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md inline-block"
          >
            Contact Support
          </Link>
          <Link
            href="/support?from=dashboard"
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all inline-block"
          >
            Support Hub
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider opacity-60 pl-1">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {TOP_FAQS.map((faq, idx) => (
            <div key={idx} className="glass p-5 rounded-2xl border border-white/5 space-y-2">
              <h4 className="text-white font-bold text-sm sm:text-base">{faq.q}</h4>
              {/* eslint-disable-next-line react/no-danger */}
              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.a }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
