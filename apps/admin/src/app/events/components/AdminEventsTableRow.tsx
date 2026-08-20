'use client';

import Link from 'next/link';
import { EVENT_STATUS_METADATA, EVENT_STATUS_TRANSITIONS, EventStatus } from '@mad/shared';
import { TableRow, TableCell, Checkbox } from '@mad/ui';
import { formatEventDate } from '@mad/utils';
import type { AdminEvent } from '@/lib/api/admin/event.service';

interface AdminEventsTableRowProps {
  event: AdminEvent;
  isSelected: boolean;
  onToggleSelect: () => void;
  canMutateEvents: boolean;
  optimisticStatus?: EventStatus;
  isStatusPending: boolean;
  onStatusChange: (status: EventStatus) => void;
  onDeleteClick: () => void;
}

export function AdminEventsTableRow({
  event,
  isSelected,
  onToggleSelect,
  canMutateEvents,
  optimisticStatus,
  isStatusPending,
  onStatusChange,
  onDeleteClick,
}: AdminEventsTableRowProps) {
  const currentStatus = optimisticStatus ?? (event.status as EventStatus);
  const statusMeta = currentStatus && currentStatus in EVENT_STATUS_METADATA
    ? EVENT_STATUS_METADATA[currentStatus as keyof typeof EVENT_STATUS_METADATA]
    : undefined;
  const allowedTransitions = (currentStatus ? EVENT_STATUS_TRANSITIONS[currentStatus] : undefined) ?? [];

  const isCompleted =
    event.status === 'completed' || event.status === 'archived' || event.lifecycle === 'COMPLETED';
  const targetUrl = isCompleted ? `/events/${event._id}/gallery` : `/events/${event._id}/edit`;

  return (
    <TableRow className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
      <TableCell sticky="start" className="py-4 px-5">
        <Checkbox
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Select event ${event.title}`}
        />
      </TableCell>
      <TableCell sticky="start" stickyOffset="3rem" showStickyDivider className="py-4 px-5">
        <Link
          href={targetUrl}
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-lg"
          aria-label={`Manage ${event.title || 'event'}`}
        >
          {event.bannerImage?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.bannerImage.url}
              alt={event.title}
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex-shrink-0 flex items-center justify-center text-accent-purple text-xs font-bold group-hover:bg-accent-purple/20 transition-colors">
              {(event.title || '?')[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-text-primary font-medium truncate max-w-52 group-hover:text-accent-purple-light transition-colors">
              {event.title || 'Untitled Event'}
            </p>
            <p className="text-text-secondary text-xs truncate group-hover:text-text-primary transition-colors">
              {event.slug || 'no-slug'}
            </p>
          </div>
        </Link>
      </TableCell>
      <TableCell className="py-4 px-4">
        {event.category ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-border-subtle text-text-secondary capitalize">
            {event.category.replace('_', ' ')}
          </span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-semibold animate-pulse inline-flex items-center gap-1">
            ⚠️ Missing Category
          </span>
        )}
      </TableCell>
      <TableCell className="py-4 px-4">
        {event.startDate ? (
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="font-semibold text-text-primary">
              {formatEventDate(event.startDate)}
              {event.endDate && ` – ${formatEventDate(event.endDate)}`}
            </span>
            {(event.bookingStartDate || event.bookingEndDate) && (
              <span className="text-[11px] text-text-muted flex items-center gap-1">
                <span className="text-accent-purple-light font-medium">Bookings:</span>
                {event.bookingStartDate ? formatEventDate(event.bookingStartDate) : 'Open'}
                {event.bookingEndDate ? ` – ${formatEventDate(event.bookingEndDate)}` : ''}
              </span>
            )}
          </div>
        ) : (
          <span className="text-text-muted text-xs">N/A</span>
        )}
      </TableCell>
      <TableCell className="py-4 px-4">
        {canMutateEvents && event.status ? (
          <div className="relative inline-flex items-center">
            <select
              id={`status-select-${event._id}`}
              value={currentStatus}
              disabled={isStatusPending || allowedTransitions.length === 0}
              onChange={(e) => onStatusChange(e.target.value as EventStatus)}
              aria-label={`Change status for ${event.title}`}
              className={`text-xs pl-3 pr-6 py-1 rounded-full border font-medium cursor-pointer bg-transparent appearance-none disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${
                statusMeta?.className ?? 'border-border-subtle text-text-secondary'
              }`}
            >
              <option value={currentStatus} className="bg-background text-text-primary">
                {statusMeta?.label ?? currentStatus}
              </option>
              {allowedTransitions.map((s) => (
                <option key={s} value={s} className="bg-background text-text-primary">
                  {EVENT_STATUS_METADATA[s]?.label ?? s}
                </option>
              ))}
            </select>
            {allowedTransitions.length > 0 && (
              <span className="pointer-events-none absolute right-2 text-[8px] text-text-muted">
                ▼
              </span>
            )}
          </div>
        ) : (
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              statusMeta?.className ?? 'border-border-subtle text-text-secondary'
            }`}
          >
            {statusMeta?.label ?? event.status?.replace('_', ' ') ?? '⚠️ Missing'}
          </span>
        )}
      </TableCell>
      <TableCell className="py-4 px-5">
        {canMutateEvents ? (
          isCompleted ? (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/events/${event._id}/gallery`}
                id={`event-gallery-btn-${event._id}`}
                className="px-3 py-1.5 text-xs font-medium glass border border-accent-pink/40 text-accent-pink hover:bg-accent-pink/10 hover:text-white rounded-lg transition-all"
              >
                Gallery
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/events/${event._id}/edit`}
                id={`event-edit-btn-${event._id}`}
                className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
              >
                Edit
              </Link>

              <button
                onClick={onDeleteClick}
                id={`event-delete-btn-${event._id}`}
                className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-red-400 hover:border-red-500/40 transition-all"
              >
                Delete
              </button>
            </div>
          )
        ) : (
          <div className="text-right text-text-secondary">—</div>
        )}
      </TableCell>
    </TableRow>
  );
}
