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
    <div className="max-w-6xl mx-auto space-y-6 text-white px-4 sm:px-6 pb-20">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium text-text-muted">
        <Link href="/events" className="hover:text-text-secondary transition-colors">
          Events
        </Link>
        <span>/</span>
        <span className="text-text-secondary truncate max-w-[150px] sm:max-w-none">
          {event.title}
        </span>
        <span>/</span>
        <span className="text-white">Gallery</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Manage Gallery</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">{event.title} • Completed Event</p>
        </div>
        <Link
          href="/events"
          className="text-text-muted text-xs sm:text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5 self-start sm:self-auto bg-surface-elevated/40 hover:bg-surface-elevated border border-border-subtle px-3 py-1.5 rounded-lg"
        >
          ← Back to Events
        </Link>
      </div>

      <EventGalleryWorkspace
        eventId={id}
        capabilities={event.capabilities}
      />
    </div>
  );
}
