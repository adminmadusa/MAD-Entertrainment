'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';

import { adminUpdateGallerySettings } from '@/lib/api/admin/event-gallery.service';
import { type EventGallerySettings } from '@mad/types';

export interface EventGallerySettingsPanelProps {
  eventId: string;
  settings: EventGallerySettings | null;
  mediaCount: number;
  disabled?: boolean;
}

export const EventGallerySettingsPanel = React.memo(function EventGallerySettingsPanel({
  eventId,
  settings,
  mediaCount,
  disabled,
}: EventGallerySettingsPanelProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const isPublished = settings?.published ?? false;

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: Partial<EventGallerySettings>) => adminUpdateGallerySettings(eventId, payload),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['admin-gallery', eventId], (old: any) => ({
        ...old,
        settings: updatedSettings,
      }));
    },
  });

  const handleTogglePublish = () => {
    // Cannot toggle if disabled (event not completed) or already published (final-state lock)
    if (disabled || isPublished) return;
    updateSettingsMutation.mutate({ published: true });
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      {/* Mobile Accordion Header */}
      <div
        className="p-6 flex justify-between items-center cursor-pointer lg:cursor-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-white font-semibold text-lg">Gallery Settings</h2>
        <button className="lg:hidden text-text-secondary" type="button">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      <div className={`px-6 pb-6 space-y-6 ${isExpanded ? 'block' : 'hidden lg:block'}`}>

        {/* Published Toggle */}
        <div className={`flex items-center justify-between p-4 bg-background-dark/50 rounded-xl border border-border-subtle ${disabled || isPublished ? 'opacity-55' : ''}`}>
          <div>
            <div className="font-medium text-white">Published Status</div>
            <div className="text-xs text-text-secondary mt-1">
              {isPublished
                ? '✅ Gallery is live — this cannot be reverted'
                : 'Make gallery visible to users'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={disabled || isPublished || updateSettingsMutation.isPending}
            aria-label={isPublished ? 'Gallery is published' : 'Publish gallery'}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPublished ? 'bg-accent-purple cursor-not-allowed' : 'bg-surface-elevated'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isPublished ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Operational Stats */}
        <div className="pt-4 border-t border-border-subtle">
          <div className="text-sm text-text-secondary space-y-2">
            <div className="flex justify-between">
              <span>Media Count</span>
              <span className="text-white">{mediaCount} items</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated</span>
              <span className="text-white">
                {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            {isPublished && settings?.publishedAt && (
              <div className="flex justify-between">
                <span>Published At</span>
                <span className="text-emerald-400">
                  {new Date(settings.publishedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
});
