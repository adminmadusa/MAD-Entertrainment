'use client';

import React from 'react';

import type { AdminTier } from '@/lib/api/admin/tier.service';
import { Modal } from '@mad/ui';

import { COLOR_PRESETS, ICON_PRESETS, getTierIcon } from './tier-presets';

export interface TierEditModalProps {
  editingTier: AdminTier | null;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onTierChange: (updated: AdminTier) => void;
  isPending: boolean;
}

export function TierEditModal({
  editingTier,
  onClose,
  onSave,
  onTierChange,
  isPending,
}: TierEditModalProps) {
  return (
    <Modal
      isOpen={!!editingTier}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="edit-tier-modal-title"
      className="glass-strong border border-border-subtle p-6 max-w-md"
    >
      {editingTier && (
        <div className="space-y-4">
          <h2 id="edit-tier-modal-title" className="text-white font-bold text-lg">
            Edit Ticket Tier
          </h2>
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="text-text-secondary text-xs font-bold block mb-1">Tier Name</label>
              <input
                value={editingTier.name}
                onChange={(e) => onTierChange({ ...editingTier, name: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
              />
            </div>

            <div>
              <label className="text-text-secondary text-xs font-bold block mb-1">Description</label>
              <textarea
                value={editingTier.description || ''}
                onChange={(e) => onTierChange({ ...editingTier, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple resize-none"
              />
            </div>

            {/* Color edit swatches */}
            <div>
              <label className="text-text-secondary text-xs font-bold block mb-1">Accent Color</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => onTierChange({ ...editingTier, color: preset.hex })}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      editingTier.color === preset.hex ? 'scale-110 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                ))}
              </div>
              <input
                value={editingTier.color || ''}
                onChange={(e) => onTierChange({ ...editingTier, color: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple font-mono"
              />
            </div>

            {/* Icon edit picker */}
            <div>
              <label className="text-text-secondary text-xs font-bold block mb-1">Icon Badge</label>
              <div className="grid grid-cols-5 gap-1.5">
                {ICON_PRESETS.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => onTierChange({ ...editingTier, icon: icon.id })}
                    className={`py-1.5 rounded-lg border flex items-center justify-center transition-all ${
                      editingTier.icon === icon.id
                        ? 'bg-accent-purple/10 text-accent-purple-light border-accent-purple/30'
                        : 'glass border-border-subtle text-text-secondary hover:text-white'
                    }`}
                  >
                    {getTierIcon(icon.id)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-text-secondary text-xs font-bold block mb-1">Sort Position</label>
                <input
                  type="number"
                  min="0"
                  value={editingTier.sortIndex ?? 0}
                  onChange={(e) => onTierChange({ ...editingTier, sortIndex: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono"
                />
              </div>
              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 text-text-secondary text-xs font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingTier.defaultVisibility !== false}
                    onChange={(e) => onTierChange({ ...editingTier, defaultVisibility: e.target.checked })}
                    className="rounded bg-background border-border-subtle text-accent-purple focus:ring-accent-purple"
                  />
                  Visible
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

export interface TierDeleteModalProps {
  deleteTierId: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function TierDeleteModal({ deleteTierId, onClose, onConfirm }: TierDeleteModalProps) {
  return (
    <Modal
      isOpen={!!deleteTierId}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="delete-tier-confirm-modal-title"
      className="glass-strong border border-border-subtle p-6 max-w-sm"
    >
      <h2 id="delete-tier-confirm-modal-title" className="text-white font-bold text-lg mb-2">
        Delete Ticket Tier?
      </h2>
      <p className="text-text-secondary text-sm mb-5">
        Are you sure you want to delete this ticket tier? Existing events referencing it will continue to render
        normally.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}
