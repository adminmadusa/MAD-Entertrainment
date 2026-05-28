"use client";

import { QUERY_KEYS } from "@mad/shared";
import { Event as EventData } from "@mad/types";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { publicGetEventBySlug } from "@/lib/api/public.service";
import { TicketSelectionContent } from "@/components/booking/TicketSelectionContent";

export default function TicketSelectionClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Fetch Event for header details
  const { data: event, isLoading: isLoadingEvent } = useQuery<EventData>({
    queryKey: QUERY_KEYS.public.events.detail(slug),
    queryFn: () => publicGetEventBySlug(slug),
    enabled: !!slug,
  });

  if (isLoadingEvent) {
    return (
      <div className="pt-20 pb-32 min-h-screen bg-[#0d111d] text-white relative animate-pulse">
        {/* Sticky Top Header Skeleton */}
        <div className="fixed top-0 left-0 right-0 bg-[#0d111d]/90 backdrop-blur-lg border-b border-white/10 py-4 z-50">
          <div className="container-mad max-w-2xl px-4 flex items-center justify-between">
            <div className="space-y-2 w-2/3">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10" />
          </div>
        </div>

        <div className="container-mad max-w-2xl px-4 mt-8 space-y-6">
          <div className="h-4 bg-white/10 rounded w-1/4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                  <div className="h-4 bg-white/10 rounded w-1/6" />
                </div>
                <div className="w-24 h-10 rounded-xl bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-muted text-sm">Event not found.</div>
      </div>
    );
  }

  const showDateTime = new Date(event.startDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="pt-20 pb-32 min-h-screen bg-[#0d111d] text-white relative">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-purple/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sticky Top Header (Mobile Only) */}
      <div className="fixed top-0 left-0 right-0 bg-[#0d111d]/90 backdrop-blur-lg border-b border-white/10 py-3 z-50 shadow-md">
        <div className="container-mad max-w-2xl px-4 flex items-center justify-between">
          <div className="space-y-0.5 max-w-[85%]">
            <h1 className="text-sm font-black text-white truncate">
              {event.title}
            </h1>
            <p className="text-[10px] text-text-muted font-medium truncate">
              {showDateTime} · {event.venue || "Venue TBA"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/events/${slug}`)}
            className="w-10 h-10 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Reusable ticket selection flow content */}
      <TicketSelectionContent event={event} isModal={false} />
    </div>
  );
}
