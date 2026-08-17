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
import { COLOR_PRESETS, ICON_PRESETS, getTierIcon } from './tier-presets';
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
      isActive: true
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
        isActive: editingTier.isActive
      }
    });
  };

  const handleDelete = (id: string) => {
    setDeleteTierId(id);
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
        {/* Left column: Visual Configurator Form */}
        {canMutate && (
          <div className="lg:col-span-1 space-y-6">
            {/* Live Preview Ticket Card */}
            <div className="glass rounded-2xl border border-border-subtle p-5 overflow-hidden relative flex flex-col justify-between h-48 bg-gradient-to-br from-white/5 to-white/0 shadow-glow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full filter blur-2xl opacity-20" style={{ backgroundColor: colorInput }} />

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all"
                    style={{ backgroundColor: colorInput }}
                  >
                    {getTierIcon(iconInput)}
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm uppercase tracking-wider">{nameInput || 'Tier Title'}</h4>
                    <p className="text-[10px] text-text-muted font-mono">{nameInput.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'slug-auto-preview'}</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-white/10 text-white/90">
                  Preview
                </span>
              </div>

              <p className="text-text-secondary text-xs line-clamp-2 italic pr-4">
                {descInput || 'Write a short description to guide customers on checkout...'}
              </p>

              <div className="flex justify-between items-center border-t border-white/5 pt-3">
                <span className="text-[10px] text-text-muted">Visibility: {defaultVisInput ? 'Visible' : 'Hidden'}</span>
                <span className="text-xs font-bold font-mono" style={{ color: colorInput }}>Order: {sortIdxInput}</span>
              </div>
            </div>

            {/* Quick Add Form */}
            <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
              <h3 className="text-white font-bold text-md">Add New Ticket Tier</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1.5">Tier Name</label>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. VIP VIP Backstage"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1.5">Description</label>
                  <textarea
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="Describe tier privileges..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple resize-none"
                  />
                </div>

                {/* Swatch Color Picker */}
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1.5">Accent Color</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setColorInput(preset.hex)}
                        title={preset.name}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          colorInput === preset.hex ? 'scale-110 border-white shadow-glow-sm' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                  <input
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    placeholder="#HEX Code"
                    className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple font-mono"
                  />
                </div>

                {/* Icon Selection Picker */}
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1.5">Icon Badge</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ICON_PRESETS.map((icon) => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setIconInput(icon.id)}
                        title={icon.label}
                        className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                          iconInput === icon.id
                            ? 'bg-accent-purple/10 text-accent-purple-light border-accent-purple/30 shadow-glow-sm'
                            : 'glass border-border-subtle text-text-secondary hover:text-white'
                        }`}
                      >
                        {getTierIcon(icon.id)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visibility & Sort Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-secondary text-xs font-bold block mb-1.5">Sort Position</label>
                    <input
                      type="number"
                      min="0"
                      value={sortIdxInput}
                      onChange={(e) => setSortIdxInput(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-2.5">
                    <label className="flex items-center gap-2 text-text-secondary text-xs font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={defaultVisInput}
                        onChange={(e) => setDefaultVisInput(e.target.checked)}
                        className="rounded bg-background border-border-subtle text-accent-purple focus:ring-accent-purple"
                      />
                      Visible by Default
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-3 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save & Publish Tier'}
                </button>
              </form>
            </div>
          </div>
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
                <div
                  key={tier._id}
                  className="glass rounded-2xl border border-border-subtle p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
                      style={{ backgroundColor: tier.color || '#6366F1' }}
                    >
                      {getTierIcon(tier.icon || 'ticket')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-white font-bold text-base">{tier.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-text-muted">
                          {tier.slug}
                        </span>
                        {tier.isActive === false && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-text-secondary text-xs mt-1 line-clamp-1 max-w-md">
                        {tier.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                    <span className="text-xs text-text-muted font-mono mr-2">Pos: {tier.sortIndex ?? 0}</span>
                    {canMutate && (
                      <>
                        <button
                          onClick={() => {
                            setValidationError(null);
                            setEditingTier({ ...tier });
                          }}
                          className="px-3 py-1.5 glass border border-border-subtle hover:border-white/20 text-xs font-semibold text-text-secondary hover:text-white rounded-xl transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tier._id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold rounded-xl transition-all"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
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
