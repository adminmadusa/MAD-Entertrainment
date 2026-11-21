'use client';

import { motion } from 'framer-motion';
import React from 'react';

import type { AdminCategory } from '@/lib/api/admin/category.service';
import { Button } from '@mad/ui';

interface CategoryListItemProps {
  item: AdminCategory;
  canMutate: boolean;
  editingId: string | null;
  editingName: string;
  onEditChange: (val: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (item: AdminCategory) => void;
  onDeleteTarget: (item: AdminCategory) => void;
  isSaving: boolean;
}

export function CategoryListItem({
  item,
  canMutate,
  editingId,
  editingName,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDeleteTarget,
  isSaving,
}: CategoryListItemProps) {
  const isEditing = editingId === item._id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-5 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors"
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            value={editingName}
            onChange={(e) => onEditChange(e.target.value)}
            className="flex-1 max-w-xs px-3 py-1.5 rounded-lg bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
            aria-label={`Edit category name for ${item.name}`}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSaveEdit(item._id)}
            disabled={isSaving}
            isLoading={isSaving}
          >
            Save
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancelEdit}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{item.name}</p>
          <p className="text-text-muted text-xs font-mono mt-0.5">{item.slug}</p>
        </div>
      )}

      {canMutate && !isEditing && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStartEdit(item)}
            aria-label={`Edit ${item.name}`}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDeleteTarget(item)}
            aria-label={`Delete ${item.name}`}
          >
            Delete
          </Button>
        </div>
      )}
    </motion.div>
  );
}
