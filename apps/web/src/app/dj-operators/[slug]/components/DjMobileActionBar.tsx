'use client';

import Link from 'next/link';

interface DjMobileActionBarProps {
  djName: string;
}

export function DjMobileActionBar({ djName }: DjMobileActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-lg border-t border-border-subtle/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex gap-3 shadow-glow-sm">
      <Link
        href="/events"
        className="flex-1 py-3 text-sm font-bold text-white btn-gradient rounded-xl shadow-glow-sm active:scale-[0.98] transition-transform text-center flex items-center justify-center"
      >
        Book Tickets
      </Link>
      <a
        href={`mailto:bookings@madentertainment.in?subject=Booking Inquiry: ${djName}`}
        className="flex-1 py-3 text-sm font-semibold text-text-primary glass border border-border-subtle hover:border-accent-purple/40 hover:bg-accent-purple/5 rounded-xl transition-all text-center flex items-center justify-center"
      >
        Send Inquiry
      </a>
    </div>
  );
}
