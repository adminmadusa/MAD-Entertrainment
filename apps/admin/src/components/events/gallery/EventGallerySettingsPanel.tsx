'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
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
  const [published, setPublished] = useState(settings?.published || false);
  const [heading, setHeading] = useState(settings?.heading || '');
  const [thankYouMessage, setThankYouMessage] = useState(settings?.thankYouMessage || '');
  const [highlightsInput, setHighlightsInput] = useState(settings?.highlights?.join(', ') || '');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (settings) {
      setPublished(settings.published);
      setHeading(settings.heading || '');
      setThankYouMessage(settings.thankYouMessage || '');
      setHighlightsInput(settings.highlights?.join(', ') || '');
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: Partial<EventGallerySettings>) => adminUpdateGallerySettings(eventId, payload),
    onSuccess: (updatedSettings) => {
      // Optimistic update of the cached settings
      queryClient.setQueryData(['admin-gallery', eventId], (old: any) => ({
        ...old,
        settings: updatedSettings,
      }));
    },
  });

  const handleTogglePublish = () => {
    if (disabled) return;
    const newPublished = !published;
    setPublished(newPublished);
    updateSettingsMutation.mutate({ published: newPublished });
  };

  const handleSaveTextSettings = () => {
    if (disabled) return;
    updateSettingsMutation.mutate({
      heading,
      thankYouMessage,
      highlights: highlightsInput.split(',').map((h) => h.trim()).filter(Boolean),
    });
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      {/* Mobile Accordion Header */}
      <div 
        className="p-6 flex justify-between items-center cursor-pointer lg:cursor-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-white font-semibold text-lg">Gallery Settings</h2>
        <button className="lg:hidden text-text-secondary">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      <div className={`px-6 pb-6 space-y-6 ${isExpanded ? 'block' : 'hidden lg:block'}`}>
        
        {/* Published Toggle */}
        <div className={`flex items-center justify-between p-4 bg-background-dark/50 rounded-xl border border-border-subtle ${disabled ? 'opacity-55' : ''}`}>
          <div>
            <div className="font-medium text-white">Published Status</div>
            <div className="text-xs text-text-secondary mt-1">Make gallery visible to users</div>
          </div>
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={disabled || updateSettingsMutation.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              published ? 'bg-accent-purple' : 'bg-surface-elevated'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                published ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Text Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Heading</label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              onBlur={handleSaveTextSettings}
              disabled={disabled}
              placeholder="e.g. Relive the Magic"
              className={`w-full bg-surface-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-white placeholder-text-secondary focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50 ${
                disabled ? 'cursor-not-allowed opacity-55' : ''
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Thank You Message</label>
            <textarea
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              onBlur={handleSaveTextSettings}
              disabled={disabled}
              placeholder="e.g. Thank you for making it a night to remember."
              rows={3}
              className={`w-full bg-surface-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-white placeholder-text-secondary focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50 resize-none ${
                disabled ? 'cursor-not-allowed opacity-55' : ''
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Highlights (comma separated)</label>
            <input
              type="text"
              value={highlightsInput}
              onChange={(e) => setHighlightsInput(e.target.value)}
              onBlur={handleSaveTextSettings}
              disabled={disabled}
              placeholder="e.g. DJ Snake, VIP Lounge"
              className={`w-full bg-surface-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-white placeholder-text-secondary focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50 ${
                disabled ? 'cursor-not-allowed opacity-55' : ''
              }`}
            />
          </div>
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
          </div>
        </div>

      </div>
    </div>
  );
});
