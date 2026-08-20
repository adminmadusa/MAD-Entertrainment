'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';

import {
  adminGetTiers,
  adminCreateTier,
  adminUpdateTier,
  adminDeleteTier,
  type AdminTier
} from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';
import { EmptyState, ErrorState } from '@mad/ui';
import { Ticket } from '@mad/ui/icons';

import { TierAddForm } from './TierAddForm';
import { TierCardItem } from './TierCardItem';
import { TierEditModal, TierDeleteModal } from './TierFormModal';

interface TabProps {
  canMutate: boolean;
  qc: ReturnType<typeof useQueryClient>;
  showToast: (msg: string) => void;
}

export function TicketTiersTab({ canMutate, qc, showToast }: TabProps) {
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [colorInput, setColorInput] = useState('#6366F1');
  const [iconInput, setIconInput] = useState('ticket');
  const [defaultVisInput, setDefaultVisInput] = useState(true);
  const [sortIdxInput, setSortIdxInput] = useState(0);

  const [editingTier, setEditingTier] = useState<AdminTier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deleteTierId, setDeleteTierId] = useState<string | null>(null);

  const { data: tiers = [], isLoading, error } = useQuery({
    queryKey: ['adminTiers'],
    queryFn: adminGetTiers,
  });

  const createMutation = useMutation({
    mutationFn: adminCreateTier,
    onSuccess: () => {
      setNameInput('');
      setDescInput('');
      setColorInput('#6366F1');
      setIconInput('ticket');
      setDefaultVisInput(true);
      setSortIdxInput(0);
      setValidationError(null);
      qc.invalidateQueries({ queryKey: ['adminTiers'] });
      showToast('Ticket tier created successfully');
    },
    onError: (err) => setValidationError(extractApiError(err).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminTier> }) =>
      adminUpdateTier(id, payload),
    onSuccess: () => {
      setEditingTier(null);
      setValidationError(null);
      qc.invalidateQueries({ queryKey: ['adminTiers'] });
      showToast('Ticket tier updated successfully');
    },
    onError: (err) => setValidationError(extractApiError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteTier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminTiers'] });
      showToast('Ticket tier deleted successfully');
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!nameInput.trim()) return;

    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorInput.trim())) {
      setValidationError('Invalid color format. Please enter a valid Hex code (e.g. #FFFFFF).');
      return;
    }

    createMutation.mutate({
      name: nameInput.trim(),
      description: descInput.trim(),
      color: colorInput.trim(),
      icon: iconInput,
      defaultVisibility: defaultVisInput,
      sortIndex: Number(sortIdxInput),
      isActive: true,
    });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setValidationError(null);

    if (!editingTier.name.trim()) return;
    if (editingTier.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(editingTier.color.trim())) {
      setValidationError('Invalid color format. Please enter a valid Hex code.');
      return;
    }

    updateMutation.mutate({
      id: editingTier._id,
      payload: {
        name: editingTier.name.trim(),
        description: editingTier.description?.trim() || '',
        color: editingTier.color?.trim() || '#6366F1',
        icon: editingTier.icon || 'ticket',
        defaultVisibility: editingTier.defaultVisibility,
        sortIndex: Number(editingTier.sortIndex || 0),
        isActive: editingTier.isActive,
      },
    });
  };

  const confirmDeleteTier = () => {
    if (!deleteTierId) return;
    deleteMutation.mutate(deleteTierId);
    setDeleteTierId(null);
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load ticket tiers.'} />
      </div>
    );
  }

  const filteredTiers = tiers.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.slug.includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && t.isActive !== false) ||
      (statusFilter === 'inactive' && t.isActive === false);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="glass p-4 rounded-2xl border border-border-subtle flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tiers by name or slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              statusFilter === 'all'
                ? 'bg-accent-purple/20 text-accent-purple-light border-accent-purple/30'
                : 'glass border-border-subtle text-text-secondary hover:text-white'
            }`}
          >
            All Tiers
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              statusFilter === 'active'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'glass border-border-subtle text-text-secondary hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              statusFilter === 'inactive'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'glass border-border-subtle text-text-secondary hover:text-white'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {validationError && (
        <div aria-live="polite" className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
          {validationError}
        </div>
      )}

      {/* Grid Layout (Desktop 2-col, Mobile 1-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {canMutate && (
          <TierAddForm
            nameInput={nameInput}
            setNameInput={setNameInput}
            descInput={descInput}
            setDescInput={setDescInput}
            colorInput={colorInput}
            setColorInput={setColorInput}
            iconInput={iconInput}
            setIconInput={setIconInput}
            defaultVisInput={defaultVisInput}
            setDefaultVisInput={setDefaultVisInput}
            sortIdxInput={sortIdxInput}
            setSortIdxInput={setSortIdxInput}
            onSubmit={handleAddSubmit}
            isPending={createMutation.isPending}
          />
        )}

        {/* Right column: Tiers Master Directory List */}
        <div className={`${canMutate ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          {isLoading ? (
            <div className="glass rounded-2xl border border-border-subtle p-8 text-center text-text-muted">
              Loading ticket tiers catalog...
            </div>
          ) : filteredTiers.length === 0 ? (
            <div className="glass rounded-2xl border border-border-subtle p-8">
              <EmptyState
                icon={<Ticket className="w-8 h-8 text-text-muted" />}
                title="No Tiers Found"
                description={searchQuery ? 'No ticket tiers matched your query.' : 'No ticket tiers defined yet. Add your first tier to get started.'}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTiers.map((tier) => (
                <TierCardItem
                  key={tier._id}
                  tier={tier}
                  canMutate={canMutate}
                  onEdit={(t) => {
                    setValidationError(null);
                    setEditingTier({ ...t });
                  }}
                  onDelete={(id) => setDeleteTierId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editing Dialog Modal */}
      <TierEditModal
        editingTier={editingTier}
        onClose={() => setEditingTier(null)}
        onSave={handleEditSave}
        onTierChange={setEditingTier}
        isPending={updateMutation.isPending}
      />

      {/* Deletion Dialog Modal */}
      <TierDeleteModal
        deleteTierId={deleteTierId}
        onClose={() => setDeleteTierId(null)}
        onConfirm={confirmDeleteTier}
      />
    </div>
  );
}
