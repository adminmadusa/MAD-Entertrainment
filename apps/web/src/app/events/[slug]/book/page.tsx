import { Metadata } from 'next';

import { publicGetEventBySlug } from '@/lib/api/public.service';
import TicketSelectionClient from './TicketSelectionClient';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await publicGetEventBySlug(slug);
    if (!event) return { title: 'Book Tickets | MAD Entertainment' };
    return {
      title: `Book Tickets for ${event.title} | MAD Entertainment`,
      description: `Select your tickets and book for ${event.title}.`,
    };
  } catch {
    return { title: 'Book Tickets | MAD Entertainment' };
  }
}

export default function TicketBookPage() {
  return <TicketSelectionClient />;
}
