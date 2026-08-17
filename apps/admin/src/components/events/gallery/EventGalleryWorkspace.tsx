'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState, useCallback } from 'react';

import {
  adminAddGalleryItems,
  adminGetGallery,
  adminUpdateGallerySettings,
} from '@/lib/api/admin/event-gallery.service';
import { adminApiClient } from '@/lib/api/client';
import { Alert, Spinner } from '@mad/ui';

import { EventGalleryGrid } from './EventGalleryGrid';

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
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-gallery', eventId],
    queryFn: () => adminGetGallery(eventId),
  });

  const items = data?.items || [];
  const settings = data?.settings || null;
  const isPublished = settings?.published ?? false;

  // Mutation to add items to gallery
  const addItemsMutation = useMutation({
    mutationFn: (newItems: any[]) => adminAddGalleryItems(eventId, newItems),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin-gallery', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin-event', eventId] });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to add image to gallery';
      setErrorMessage(typeof message === 'string' ? message : JSON.stringify(message));
    },
  });

  // Mutation to toggle published status
  const updateSettingsMutation = useMutation({
    mutationFn: (payload: { published: boolean }) =>
      adminUpdateGallerySettings(eventId, payload),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['admin-gallery', eventId], (old: any) => ({
        ...old,
        settings: updatedSettings,
      }));
      queryClient.invalidateQueries({ queryKey: ['admin-event', eventId] });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to update gallery settings';
      setErrorMessage(typeof message === 'string' ? message : JSON.stringify(message));
    },
  });

  const handleTogglePublish = () => {
    if (updateSettingsMutation.isPending) return;
    if (capabilities && !capabilities.canPublishGallery) {
      setErrorMessage('Galleries can only be published once the event is completed.');
      return;
    }
    updateSettingsMutation.mutate({ published: !isPublished });
  };

  // Upload handler for files dropped or selected from the + tile
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsUploading(true);
      setErrorMessage(null);

      const uploadedAssets: { url: string; publicId: string; mediaType: string }[] = [];

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('image', file);
          const sessionId = 'session_' + crypto.randomUUID().slice(0, 8);

          const { data: uploadRes } = await adminApiClient.post<{
            data: { url: string; publicId: string; hash: string };
          }>(
            `/admin/uploads/image?folder=events&sessionId=${sessionId}`,
            formData,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 300000,
            }
          );

          if (uploadRes?.data?.url) {
            uploadedAssets.push({
              url: uploadRes.data.url,
              publicId: uploadRes.data.publicId,
              mediaType: 'IMAGE',
            });
          }
        } catch (err: any) {
          console.error('[EventGalleryWorkspace] Upload error:', err);
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            `Failed to upload ${file.name}`;
          setErrorMessage(typeof msg === 'string' ? msg : 'Upload failed');
        }
      }

      setIsUploading(false);

      if (uploadedAssets.length > 0) {
        addItemsMutation.mutate(uploadedAssets);
      }
    },
    [addItemsMutation]
  );

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Spinner size="lg" className="text-accent-purple" aria-label="Loading gallery" />
      </div>
    );
  }

  const canUpload = capabilities ? capabilities.canUploadGallery : true;

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Alert variant="danger" className="animate-in fade-in duration-300" role="alert">
          <div className="flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold underline ml-4 hover:opacity-80"
              type="button"
            >
              Dismiss
            </button>
          </div>
        </Alert>
      )}

      {/* Top Action Bar */}
      <div className="glass rounded-2xl border border-border-subtle p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Stats & Status */}
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-full border border-white/10">
            {items.length} {items.length === 1 ? 'Photo' : 'Photos'}
          </span>
          <span
            className={`text-xs sm:text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1.5 border ${
              isPublished
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-white/5 text-text-muted border-white/10'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-text-muted'
              }`}
            />
            {isPublished ? 'Live on Website' : 'Hidden from Website'}
          </span>
        </div>

        {/* Right: Publish Toggle Control */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">
              {isPublished ? 'Published' : 'Unpublished'}
            </div>
            <div className="text-[10px] text-text-muted">
              {isPublished ? 'Publicly visible' : 'Hidden from public'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={updateSettingsMutation.isPending}
            aria-label={isPublished ? 'Unpublish gallery' : 'Publish gallery'}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-purple ${
              isPublished ? 'bg-accent-purple' : 'bg-surface-elevated'
            } ${updateSettingsMutation.isPending ? 'opacity-50 cursor-wait' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isPublished ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Full-Width Thumbnail Grid with in-grid + tile */}
      <div className="w-full">
        <EventGalleryGrid
          eventId={eventId}
          items={items}
          onUpload={handleUpload}
          isUploading={isUploading || addItemsMutation.isPending}
          canUpload={canUpload}
        />
      </div>
    </div>
  );
});
