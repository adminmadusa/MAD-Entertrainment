import Link from 'next/link';
import React from 'react';

import type { TicketProfile } from '@mad/types';
import { TableRow, TableCell, Checkbox } from '@mad/ui';
import { formatDate } from '@mad/utils';

interface TicketProfileRowProps {
  profile: TicketProfile;
  isSelected: boolean;
  onToggleSelect: () => void;
  canMutate: boolean;
  onToggleStatus: (id: string, nextStatus: boolean) => void;
  onDeleteTarget: (profile: TicketProfile) => void;
}

export function TicketProfileRow({
  profile,
  isSelected,
  onToggleSelect,
  canMutate,
  onToggleStatus,
  onDeleteTarget,
}: TicketProfileRowProps) {
  const ticketsCount = profile.groups?.reduce((sum, group) => sum + (group.tickets?.length || 0), 0) || 0;

  return (
    <TableRow className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
      <TableCell className="w-12 px-4 text-center">
        <Checkbox
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Select ${profile.name}`}
        />
      </TableCell>
      <TableCell className="py-4 px-5">
        <div>
          <span className="text-white font-bold text-sm block">
            {profile.name}
          </span>
          {profile.description && (
            <p className="text-text-muted text-xs mt-1 max-w-xs truncate">{profile.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4 px-4 text-text-secondary font-medium">
        <span className="text-white bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10 font-mono text-xs">
          {profile.groups?.length || 0}
        </span>
      </TableCell>
      <TableCell className="py-4 px-4 text-text-secondary font-medium">
        <span className="text-accent-purple-light font-semibold font-mono text-xs">
          {ticketsCount}
        </span>
      </TableCell>
      <TableCell className="py-4 px-4 text-text-secondary text-xs">
        {formatDate(profile.createdAt)}
      </TableCell>
      <TableCell className="py-4 px-4">
        {canMutate ? (
          <button
            onClick={() => onToggleStatus(profile._id, !profile.isActive)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
              profile.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            {profile.isActive ? 'Active' : 'Inactive'}
          </button>
        ) : (
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
            profile.isActive
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {profile.isActive ? 'Active' : 'Inactive'}
          </span>
        )}
      </TableCell>
      <TableCell className="py-4 px-5">
        {canMutate ? (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/ticket-profiles/${profile._id}/edit`}
              className="px-3 py-1.5 text-xs font-semibold glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
            >
              Edit
            </Link>
            <button
              onClick={() => onDeleteTarget(profile)}
              className="px-3 py-1.5 text-xs font-semibold glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="text-right text-text-muted">—</div>
        )}
      </TableCell>
    </TableRow>
  );
}
