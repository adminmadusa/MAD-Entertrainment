import { Metadata } from 'next';
import Link from 'next/link';

import { SupportHubClient } from '@/components/support/SupportHubClient';

export const metadata: Metadata = {
  title: 'Support Center | MAD Entertainment',
  description: 'Get help with tickets, payments, events, and account issues.',
  alternates: {
    canonical: 'https://www.madentertainments.net/support',
  },
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const resolvedParams = await searchParams;
  const from = resolvedParams.from;

  return (
    <div className="container-mad pt-32 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {from === 'dashboard' && (
          <div className="flex justify-start">
            <Link
              href="/dashboard?tab=support"
              className="flex items-center gap-2 text-text-secondary hover:text-white transition-all text-sm font-semibold animate-in fade-in slide-in-from-left-4 duration-300"
            >
              <span>←</span> Back to Dashboard
            </Link>
          </div>
        )}
        <SupportHubClient />
      </div>
    </div>
  );
}
