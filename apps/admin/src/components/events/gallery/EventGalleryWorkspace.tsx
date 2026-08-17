'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import React from 'react';

import { adminAddGalleryItems, adminGetGallery } from '@/lib/api/admin/event-gallery.service';
import { UnifiedMediaUpload } from '@/components/UnifiedMediaUpload';
import { Spinner } from '@mad/ui';

import { EventGalleryGrid } from './EventGalleryGrid';
import { EventGallerySettingsPanel } from './EventGallerySettingsPanel';

export interface EventGalleryWorkspaceProps {
  eventId: string;
  capabilities?: {
    canBook: boolean;
    canViewGallery: boolean;
    canUploadGallery: boolean;
    canPublishGallery: boolean;
  };
  readOnly?: boolean;
}

export const EventGalleryWorkspace = React.memo(function EventGalleryWorkspace({
  eventId,
  capabilities,
  readOnly = false,
}: EventGalleryWorkspaceProps) {
  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-gallery', eventId],
    queryFn: () => adminGetGallery(eventId),
  });

  const addItemsMutation = useMutation({
    mutationFn: (items: any[]) => adminAddGalleryItems(eventId, items),
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Spinner size="lg" className="text-accent-purple" aria-label="Loading gallery" />
      </div>
    );
  }

  const items = data?.items || [];
  const settings = data?.settings || null;

  return (
    <div className="space-y-6">
      {/* Upload Section Full Width */}
      {readOnly ? (
        <div className="border border-border-subtle bg-surface-elevated/40 opacity-70 rounded-2xl p-6 sm:p-8 text-center cursor-not-allowed">
          <div className="text-3xl sm:text-4xl mb-3">🔒</div>
          <h3 className="text-white font-medium text-sm sm:text-base mb-1">Gallery Locked (Published)</h3>
          <p className="text-text-muted text-xs sm:text-sm">Published galleries cannot be modified</p>
        </div>
      ) : !capabilities?.canUploadGallery ? (
        <div className="border border-border-subtle bg-surface-elevated/40 opacity-40 rounded-2xl p-6 sm:p-8 text-center cursor-not-allowed">
          <div className="text-3xl sm:text-4xl mb-3">🔒</div>
          <h3 className="text-white font-medium text-sm sm:text-base mb-1">Gallery Uploads Locked</h3>
          <p className="text-text-muted text-xs sm:text-sm">This event has not completed yet</p>
        </div>
      ) : (
        <UnifiedMediaUpload
          triggerOnly
          disabled={addItemsMutation.isPending}
          onUploadsSuccess={(assets) => {
            const payload = assets.map((asset) => ({
              url: asset.url,
              publicId: asset.publicId,
              mediaType: 'IMAGE' as any,
            }));
            addItemsMutation.mutate(payload);
          }}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Grid */}
        <div className="w-full lg:w-2/3">
          <EventGalleryGrid eventId={eventId} items={items} readOnly={readOnly} />
        </div>

        {/* Right Column: Settings */}
        <div className="w-full lg:w-1/3">
          <EventGallerySettingsPanel
            eventId={eventId}
            settings={settings}
            mediaCount={items.length}
            disabled={capabilities && (!capabilities.canPublishGallery || readOnly)}
          />
        </div>
      </div>
    </div>
  );
});
