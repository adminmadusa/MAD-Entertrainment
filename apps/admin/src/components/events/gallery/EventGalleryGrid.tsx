'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useState } from 'react';

import {
  adminUpdateGalleryItem,
  adminSetGalleryCover,
  adminReorderGalleryItems,
  adminDeleteGalleryItem,
} from '@/lib/api/admin/event-gallery.service';
import { type EventGalleryItem, MediaVisibility } from '@mad/types';

export interface EventGalleryGridProps {
  eventId: string;
  items: EventGalleryItem[];
}

export const EventGalleryGrid = React.memo(function EventGalleryGrid({
  eventId,
  items,
}: EventGalleryGridProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Invalidate wrapper for mutations
  const refreshGallery = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-gallery', eventId] });
  };

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: any }) => adminUpdateGalleryItem(eventId, itemId, payload),
    onSuccess: refreshGallery,
  });

  const setCoverMutation = useMutation({
    mutationFn: (itemId: string) => adminSetGalleryCover(eventId, itemId),
    onSuccess: refreshGallery,
  });

  const reorderMutation = useMutation({
    mutationFn: (payload: { id: string; sortOrder: number }[]) => adminReorderGalleryItems(eventId, payload),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['admin-gallery', eventId] });
      const previousGallery = queryClient.getQueryData(['admin-gallery', eventId]);

      // Optimistically update
      queryClient.setQueryData(['admin-gallery', eventId], (old: any) => {
        if (!old) return old;
        const newItems = [...old.items];
        newOrder.forEach((update) => {
          const item = newItems.find((i) => i.id === update.id);
          if (item) item.sortOrder = update.sortOrder;
        });
        newItems.sort((a, b) => a.sortOrder - b.sortOrder);
        return { ...old, items: newItems };
      });

      return { previousGallery };
    },
    onError: (_err, _newOrder, context: any) => {
      queryClient.setQueryData(['admin-gallery', eventId], context.previousGallery);
    },
    onSettled: refreshGallery,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => adminDeleteGalleryItem(eventId, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['admin-gallery', eventId] });
      const previousGallery = queryClient.getQueryData(['admin-gallery', eventId]);

      queryClient.setQueryData(['admin-gallery', eventId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((i: any) => i.id !== itemId),
        };
      });

      return { previousGallery };
    },
    onError: (_err, _itemId, context: any) => {
      queryClient.setQueryData(['admin-gallery', eventId], context.previousGallery);
    },
    onSettled: () => {
      setDeletingId(null);
      refreshGallery();
    },
  });

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Recalculate sortOrders
    const payload = newItems.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    reorderMutation.mutate(payload);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this media item?')) {
      setDeletingId(id);
      deleteItemMutation.mutate(id);
    }
  };

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl border border-border-subtle p-12 text-center">
        <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📸</span>
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">No gallery items yet</h3>
        <p className="text-text-muted">Upload your first event photos using the upload zone above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <GalleryGridItem
          key={item.id}
          item={item}
          index={index}
          totalItems={items.length}
          moveItem={moveItem}
          updateItemMutation={updateItemMutation}
          setCoverMutation={setCoverMutation}
          deletingId={deletingId}
          handleDelete={handleDelete}
        />
      ))}
    </div>
  );
});

const GalleryGridItem = React.memo(function GalleryGridItem({
  item,
  index,
  totalItems,
  moveItem,
  updateItemMutation,
  setCoverMutation,
  deletingId,
  handleDelete,
}: {
  item: EventGalleryItem;
  index: number;
  totalItems: number;
  moveItem: (index: number, direction: 'up' | 'down') => void;
  updateItemMutation: any;
  setCoverMutation: any;
  deletingId: string | null;
  handleDelete: (id: string) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`glass rounded-2xl border ${
        item.isCover
          ? 'border-accent-purple shadow-[0_0_15px_rgba(139,92,246,0.25)]'
          : 'border-border-subtle'
      } overflow-hidden relative group transition-all duration-300 hover:border-accent-purple/40`}
    >
      {/* Image Container */}
      <div className="aspect-square w-full relative bg-surface-elevated overflow-hidden">
        {imgError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-elevated/60 text-text-muted">
            <span className="text-3xl mb-1.5">🖼️</span>
            <span className="text-xs font-medium tracking-wide">Failed to load media</span>
          </div>
        ) : (
          <Image
            src={item.url}
            alt={item.caption || 'Gallery Image'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        )}
        {/* Cover Badge */}
        {item.isCover && (
          <div className="absolute top-3 left-3 bg-accent-purple text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shadow-lg backdrop-blur-sm bg-opacity-90">
            <span>⭐</span> Cover
          </div>
        )}
        {/* Order Controls */}
        <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => moveItem(index, 'up')}
            disabled={index === 0}
            className="p-1.5 bg-black/60 hover:bg-black/85 text-white rounded backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move Up"
          >
            ↑
          </button>
          <button
            onClick={() => moveItem(index, 'down')}
            disabled={index === totalItems - 1}
            className="p-1.5 bg-black/60 hover:bg-black/85 text-white rounded backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move Down"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Details / Controls */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-text-muted">Visibility</label>
          <select
            value={item.visibility}
            onChange={(e) => updateItemMutation.mutate({ itemId: item.id, payload: { visibility: e.target.value } })}
            className="bg-surface-elevated border border-border-subtle text-white text-sm rounded-lg px-2.5 py-1.5 outline-none focus:border-accent-purple cursor-pointer transition-colors"
          >
            <option value={MediaVisibility.PUBLIC}>🌍 Public</option>
            <option value={MediaVisibility.PRIVATE}>🔒 Private</option>
          </select>
        </div>

        <div>
          <input
            type="text"
            defaultValue={item.caption || ''}
            placeholder="Add a caption..."
            onBlur={(e) => {
              if (e.target.value !== item.caption) {
                updateItemMutation.mutate({ itemId: item.id, payload: { caption: e.target.value } });
              }
            }}
            className="w-full bg-transparent border-b border-border-subtle text-white text-sm py-1 focus:outline-none focus:border-accent-purple transition-colors placeholder-text-muted/60"
          />
        </div>

        <div className="pt-2 flex gap-2">
          {!item.isCover && (
            <button
              onClick={() => setCoverMutation.mutate(item.id)}
              disabled={setCoverMutation.isPending}
              className="flex-1 text-xs py-2 rounded-xl border border-border-subtle text-text-muted hover:text-white hover:border-text-muted transition-colors disabled:opacity-50 font-medium"
            >
              Set as Cover
            </button>
          )}
          <button
            onClick={() => handleDelete(item.id)}
            disabled={deletingId === item.id}
            className={`flex-1 text-xs py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-50 font-medium ${
              item.isCover ? 'w-full' : ''
            }`}
          >
            {deletingId === item.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
});
