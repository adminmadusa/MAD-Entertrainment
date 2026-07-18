'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { adminGetGallery } from '@/lib/api/admin/event-gallery.service';
import { EventGalleryGrid } from './EventGalleryGrid';
import { EventGallerySettingsPanel } from './EventGallerySettingsPanel';
import { EventGalleryUploadZone } from './EventGalleryUploadZone';

export interface EventGalleryWorkspaceProps {
  eventId: string;
  capabilities?: {
    canBook: boolean;
    canViewGallery: boolean;
    canUploadGallery: boolean;
    canPublishGallery: boolean;
  };
}

export const EventGalleryWorkspace = React.memo(function EventGalleryWorkspace({
  eventId,
  capabilities,
}: EventGalleryWorkspaceProps) {
  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-gallery', eventId],
    queryFn: () => adminGetGallery(eventId),
  });

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-purple" />
      </div>
    );
  }

  const items = data?.items || [];
  const settings = data?.settings || null;

  return (
    <div className="space-y-6">
      {capabilities && !capabilities.canUploadGallery && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
          <span>⚠️ Gallery uploads and publishing settings are locked until the event starts and completes.</span>
        </div>
      )}

      {/* Upload Section Full Width */}
      <EventGalleryUploadZone
        eventId={eventId}
        onUploadComplete={() => refetch()}
        disabled={capabilities && !capabilities.canUploadGallery}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Grid */}
        <div className="w-full lg:w-2/3">
          <EventGalleryGrid eventId={eventId} items={items} />
        </div>

        {/* Right Column: Settings */}
        <div className="w-full lg:w-1/3">
          <EventGallerySettingsPanel
            eventId={eventId}
            settings={settings}
            mediaCount={items.length}
            disabled={capabilities && !capabilities.canPublishGallery}
          />
        </div>
      </div>
    </div>
  );
});
