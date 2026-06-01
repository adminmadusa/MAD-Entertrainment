import { Metadata } from 'next';
import { SupportHubClient } from '@/components/support/SupportHubClient';

export const metadata: Metadata = {
  title: 'Support Center | MAD Entertainment',
  description: 'Get help with tickets, payments, events, and account issues.',
  alternates: {
    canonical: 'https://madentertainment.in/support',
  },
};

export default function SupportPage() {
  return (
    <div className="container-mad pt-32 pb-20 min-h-screen">
      <SupportHubClient />
    </div>
  );
}
