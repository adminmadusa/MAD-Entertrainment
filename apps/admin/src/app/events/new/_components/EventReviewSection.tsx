import React from 'react';
import { EventStatus } from '@mad/shared';
import { Button, Badge } from '@mad/ui';
import { type TicketTierInput } from '@/components/events/EventTicketingCard';
import type { CloudinaryImage } from '@/lib/api/admin/event.service';

interface EventReviewSectionProps {
  title: string;
  category: string;
  description: string;
  venueName: string;
  status: EventStatus;
  startDate: string;
  endDate: string;
  bookingStartDate: string;
  bookingEndDate: string;
  requireTerms: boolean;
  requireAgeConfirmation: boolean;
  ageRestriction: number | '';
  tags: string;
  ticketingType: 'custom' | 'profile';
  tiers: TicketTierInput[];
  selectedProfileId: string;
  coverImage: CloudinaryImage | null;
  posterImage: CloudinaryImage | null;
  galleryImages: CloudinaryImage[];
  onEditStep: (step: number) => void;
}

export const EventReviewSection: React.FC<EventReviewSectionProps> = ({
  title,
  category,
  description,
  venueName,
  status,
  startDate,
  endDate,
  bookingStartDate,
  bookingEndDate,
  requireTerms,
  requireAgeConfirmation,
  ageRestriction,
  tags,
  ticketingType,
  tiers,
  selectedProfileId,
  coverImage,
  posterImage,
  galleryImages: _galleryImages,
  onEditStep,
}) => {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="p-5 border border-border-subtle rounded-xl bg-surface">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Basic Information
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(0)}>
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted block mb-1">Title</span>
            <span className="text-white font-medium">{title || '—'}</span>
          </div>
          <div>
            <span className="text-text-muted block mb-1">Category</span>
            <span className="text-white font-medium capitalize">{category || '—'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-text-muted block mb-1">Description</span>
            <span className="text-white font-medium whitespace-pre-wrap">{description || '—'}</span>
          </div>
          <div>
            <span className="text-text-muted block mb-1">Venue</span>
            <span className="text-white font-medium">{venueName || '—'}</span>
          </div>
          <div>
            <span className="text-text-muted block mb-1">Status</span>
            <Badge variant={status === EventStatus.PUBLISHED ? 'success' : 'default'}>{status}</Badge>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="p-5 border border-border-subtle rounded-xl bg-surface">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Schedule
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted block mb-1">Start Date</span>
            <span className="text-white font-medium">{startDate ? new Date(startDate).toLocaleString() : '—'}</span>
          </div>
          <div>
            <span className="text-text-muted block mb-1">End Date</span>
            <span className="text-white font-medium">{endDate ? new Date(endDate).toLocaleString() : '—'}</span>
          </div>
          <div>
            <span className="text-text-muted block mb-1">Booking Opens</span>
            <span className="text-white font-medium">
              {bookingStartDate ? new Date(bookingStartDate).toLocaleString() : 'Immediately on publish'}
            </span>
          </div>
          <div>
            <span className="text-text-muted block mb-1">Booking Closes</span>
            <span className="text-white font-medium">
              {bookingEndDate ? new Date(bookingEndDate).toLocaleString() : (startDate ? new Date(startDate).toLocaleString() : '—')}
            </span>
          </div>
        </div>
      </div>

      {/* Ticket Configuration */}
      <div className="p-5 border border-border-subtle rounded-xl bg-surface">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Ticket Configuration & Requirements
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
            Edit
          </Button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-text-muted block mb-1">Ticketing Type</span>
            <span className="text-white font-medium capitalize">{ticketingType}</span>
          </div>

          {ticketingType === 'custom' && (
            <div className="space-y-2">
              <span className="text-text-muted block">Ticket Tiers</span>
              <div className="bg-surface-elevated rounded-lg p-3 space-y-2">
                {tiers.map((tier, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-2 border-b border-border-subtle last:border-0 last:pb-0">
                    <span className="text-white font-medium capitalize">{tier.name}</span>
                    <div className="text-text-muted text-xs text-right">
                      <div>Price: {tier.price}</div>
                      <div>Capacity: {tier.capacity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ticketingType === 'profile' && (
            <div>
              <span className="text-text-muted block mb-1">Selected Profile ID</span>
              <span className="text-white font-medium">{selectedProfileId || '—'}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-subtle">
            <div>
              <span className="text-text-muted block mb-1">Requirements</span>
              <div className="space-y-1">
                {requireTerms && <div className="text-white">✓ Terms & Conditions</div>}
                {requireAgeConfirmation && <div className="text-white">✓ Age Confirmation ({ageRestriction}+)</div>}
              </div>
            </div>
            <div>
              <span className="text-text-muted block mb-1">Tags</span>
              <div className="space-y-1">
                {tags.split(',').filter(Boolean).map(t => (
                  <Badge key={t} variant="default" className="mr-1 mb-1">{t.trim()}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="p-5 border border-border-subtle rounded-xl bg-surface">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Media
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(3)}>
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted block mb-2">Cover Image</span>
            {coverImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={coverImage.url} alt="Cover" className="w-full h-32 object-cover rounded-lg border border-border" />
            ) : (
              <div className="w-full h-32 bg-surface-elevated rounded-lg flex items-center justify-center text-text-muted">No Image</div>
            )}
          </div>
          <div>
            <span className="text-text-muted block mb-2">Poster Image</span>
            {posterImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={posterImage.url} alt="Poster" className="w-full h-32 object-cover rounded-lg border border-border" />
            ) : (
              <div className="w-full h-32 bg-surface-elevated rounded-lg flex items-center justify-center text-text-muted">No Image</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
