'use client';

import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { EventGalleryItem } from '@mad/types';
import { Alert, Spinner } from '@mad/ui';

import {
  adminAddGalleryItems,
  adminDeleteGalleryItem,
  adminGetGallery,
  adminSetCoverGalleryItem,
  adminUpdateGallerySettings,
} from '@/lib/api/admin/event-gallery.service';
import { adminApiClient } from '@/lib/api/client';

import { EventGalleryDeleteModal } from './EventGalleryDeleteModal';
import { EventGalleryGrid } from './EventGalleryGrid';
import { EventGalleryTopBar } from './EventGalleryTopBar';

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
  const [itemToDelete, setItemToDelete] = useState<EventGalleryItem | null>(null);

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

  // Mutation to delete a gallery item
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => adminDeleteGalleryItem(eventId, itemId),
    onSuccess: () => {
      setErrorMessage(null);
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin-gallery', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin-event', eventId] });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to delete image from gallery';
      setErrorMessage(typeof message === 'string' ? message : JSON.stringify(message));
    },
  });

  // Mutation to set cover image
  const setCoverMutation = useMutation({
    mutationFn: (itemId: string) => adminSetCoverGalleryItem(eventId, itemId),
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
        'Failed to set cover photo';
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

  const handleSetCover = useCallback(
    (item: EventGalleryItem) => {
      if (setCoverMutation.isPending) return;
      const itemId = item.id || item.publicId;
      if (!itemId) return;
      setCoverMutation.mutate(itemId);
    },
    [setCoverMutation]
  );

  const handleDeleteRequest = useCallback((item: EventGalleryItem) => {
    setItemToDelete(item);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!itemToDelete) return;
    const itemId = itemToDelete.id || itemToDelete.publicId;
    if (!itemId) return;
    deleteItemMutation.mutate(itemId);
  }, [itemToDelete, deleteItemMutation]);

  const MAX_GALLERY_PHOTOS = 20;

  // Upload handler for files dropped or selected from the + tile
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const remainingSlots = Math.max(0, MAX_GALLERY_PHOTOS - items.length);
      if (remainingSlots <= 0) {
        setErrorMessage(`Event gallery has reached the maximum limit of ${MAX_GALLERY_PHOTOS} photos.`);
        return;
      }

      const filesToUpload = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        setErrorMessage(`Only ${remainingSlots} photo(s) could be uploaded to stay within the ${MAX_GALLERY_PHOTOS}-photo limit.`);
      } else {
        setErrorMessage(null);
      }

      setIsUploading(true);

      const uploadedAssets: { url: string; publicId: string; mediaType: string }[] = [];

      for (const file of filesToUpload) {
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
    [addItemsMutation, items.length]
  );

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Spinner size="lg" className="text-accent-purple" aria-label="Loading gallery" />
      </div>
    );
  }

  const canUpload = (capabilities ? capabilities.canUploadGallery : true) && items.length < MAX_GALLERY_PHOTOS;
  const isMutating =
    deleteItemMutation.isPending || setCoverMutation.isPending;

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

      <EventGalleryTopBar
        itemCount={items.length}
        maxPhotos={MAX_GALLERY_PHOTOS}
        isPublished={isPublished}
        isUpdating={updateSettingsMutation.isPending}
        onTogglePublish={handleTogglePublish}
      />

      <div className="w-full">
        <EventGalleryGrid
          eventId={eventId}
          items={items}
          onUpload={handleUpload}
          onSetCover={handleSetCover}
          onDelete={handleDeleteRequest}
          isUploading={isUploading || addItemsMutation.isPending}
          isMutating={isMutating}
          canUpload={canUpload}
        />
      </div>

      {itemToDelete && (
        <EventGalleryDeleteModal
          item={itemToDelete}
          isDeleting={deleteItemMutation.isPending}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
});
