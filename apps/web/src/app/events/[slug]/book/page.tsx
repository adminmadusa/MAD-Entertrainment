import { Metadata, ResolvingMetadata } from 'next';
import { getCachedEvent } from '@/utils/cached-event';
import TicketSelectionClient from './TicketSelectionClient';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await getCachedEvent(slug);
    if (!event) return { title: 'Book Tickets | MAD Entertainment' };
    return {
      title: `Book Tickets for ${event.title} | MAD Entertainment`,
      description: `Select your tickets and book for ${event.title}.`,
    };
  } catch {
    return { title: 'Book Tickets | MAD Entertainment' };
  }
}

export default async function TicketBookPage({ params }: Props) {
  const { slug } = await params;
  let initialEvent: Awaited<ReturnType<typeof getCachedEvent>> | undefined;
  try {
    initialEvent = await getCachedEvent(slug);
  } catch {
    // Swallow — client will re-fetch
  }
  return <TicketSelectionClient initialEvent={initialEvent} />;
}
