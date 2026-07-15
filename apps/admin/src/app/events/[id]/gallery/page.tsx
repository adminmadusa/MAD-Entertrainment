'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { EventGalleryWorkspace } from '@/components/events/gallery/EventGalleryWorkspace';
import { adminGetEvent } from '@/lib/api/admin/event.service';

export default function EventGalleryPage() {
  const { id } = useParams() as { id: string };

  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['admin-event', id],
    queryFn: () => adminGetEvent(id),
  });

  if (isEventLoading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-purple" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-12 text-center text-red-400">
        Event not found.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-white pb-20">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm font-medium text-text-muted">
        <Link href="/events" className="hover:text-text-secondary transition-colors">
          Events
        </Link>
        <span>/</span>
        <Link href={`/events/${id}/edit`} className="hover:text-text-secondary transition-colors">
          {event.title}
        </Link>
        <span>/</span>
        <span className="text-white">Gallery</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Manage Gallery</h1>
          <p className="text-text-muted text-sm mt-0.5">Manage event media, cover images, and visibility</p>
        </div>
        <Link
          href={`/events/${id}/edit`}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back to Event
        </Link>
      </div>

      <EventGalleryWorkspace eventId={id} />
    </div>
  );
}
