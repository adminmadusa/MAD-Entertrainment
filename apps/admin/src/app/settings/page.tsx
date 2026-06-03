'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAdminAuth } from '@/hooks/use-admin-auth.hook';

import { adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory, type AdminCategory } from '@/lib/api/admin/category.service';
import { adminGetTiers, adminCreateTier, adminUpdateTier, adminDeleteTier, type AdminTier } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';

export default function SettingsPage() {
  const { admin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'categories' | 'tiers'>('categories');
  const canMutateSettings = !!admin?.role && ['super_admin', 'admin', 'manager'].includes(admin.role);
  const [nameInput, setNameInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  // Categories Queries
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: adminGetCategories,
  });

  const createCategoryMutation = useMutation({
    mutationFn: adminCreateCategory,
    onSuccess: () => {
      setNameInput('');
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminCategory> }) => adminUpdateCategory(id, payload),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: adminDeleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  // Tiers Queries
  const { data: tiers = [], isLoading: loadingTiers } = useQuery({
    queryKey: ['adminTiers'],
    queryFn: adminGetTiers,
  });

  const createTierMutation = useMutation({
    mutationFn: adminCreateTier,
    onSuccess: () => {
      setNameInput('');
      queryClient.invalidateQueries({ queryKey: ['adminTiers'] });
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminTier> }) => adminUpdateTier(id, payload),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['adminTiers'] });
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const deleteTierMutation = useMutation({
    mutationFn: adminDeleteTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTiers'] });
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nameInput.trim()) return;

    if (activeTab === 'categories') {
      createCategoryMutation.mutate({ name: nameInput.trim() });
    } else {
      createTierMutation.mutate({ name: nameInput.trim() });
    }
  };

  const handleSaveEdit = (id: string) => {
    setError('');
    if (!editingName.trim()) return;

    if (activeTab === 'categories') {
      updateCategoryMutation.mutate({ id, payload: { name: editingName.trim() } });
    } else {
      updateTierMutation.mutate({ id, payload: { name: editingName.trim() } });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration? Past events and bookings using it will remain preserved.')) return;
    setError('');
    if (activeTab === 'categories') {
      deleteCategoryMutation.mutate(id);
    } else {
      deleteTierMutation.mutate(id);
    }
  };

  const items = activeTab === 'categories' ? categories : tiers;
  const isLoading = activeTab === 'categories' ? loadingCategories : loadingTiers;

  const renderListContent = () => {
    if (isLoading) {
      return (
        <div className="p-12 text-center text-text-muted text-sm animate-pulse">Loading list...</div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="p-12 text-center text-text-muted text-sm capitalize">
          No custom {activeTab} defined yet. Add one on the left!
        </div>
      );
    }

    return (
      <div className="divide-y divide-border-subtle/50">
        <AnimatePresence>
          {(items as (AdminCategory | AdminTier)[]).map((item) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors"
            >
              {editingId === item._id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-1.5 rounded-lg bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                  />
                  <button
                    onClick={() => handleSaveEdit(item._id)}
                    className="px-3 py-1.5 bg-accent-purple/20 text-accent-purple-light text-xs font-bold rounded-lg hover:bg-accent-purple/30 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 bg-white/5 text-text-secondary text-xs font-bold rounded-lg hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{item.name}</p>
                  <p className="text-text-muted text-xs font-mono mt-0.5">{item.slug}</p>
                </div>
              )}

              {canMutateSettings && editingId !== item._id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(item._id); setEditingName(item.name); }}
                    className="px-3 py-1.5 bg-white/5 text-text-secondary hover:text-white text-xs font-bold rounded-lg transition-colors border border-white/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 text-xs font-bold rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">System Settings</h1>
        <p className="text-text-muted text-sm mt-0.5">Manage dynamic Event Categories and Ticket Tiers visually</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => { setActiveTab('categories'); setError(''); setEditingId(null); }}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'categories'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Event Categories
        </button>
        <button
          onClick={() => { setActiveTab('tiers'); setError(''); setEditingId(null); }}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'tiers'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Ticket Tiers
        </button>
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Quick Add Form */}
        {canMutateSettings && (
          <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
            <h2 className="text-white font-semibold capitalize">Add Custom {activeTab === 'categories' ? 'Category' : 'Tier'}</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-text-secondary text-xs font-semibold block mb-1.5 capitalize">{activeTab === 'categories' ? 'Category' : 'Tier'} Name</label>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={activeTab === 'categories' ? 'e.g. Pool Party' : 'e.g. VIP Backstage'}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={createCategoryMutation.isPending || createTierMutation.isPending}
                className="w-full py-2.5 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
              >
                Add Entry
              </button>
            </form>
          </div>
        )}

        {/* Categories/Tiers List */}
        <div className={`${canMutateSettings ? 'md:col-span-2' : 'md:col-span-3'} glass rounded-2xl border border-border-subtle overflow-hidden`}>
          <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center">
            <h2 className="text-white font-semibold capitalize">Active {activeTab}</h2>
            <span className="text-xs bg-accent-purple/10 text-accent-purple-light font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {items.length} {activeTab === 'categories' ? 'Total' : 'Tiers'}
            </span>
          </div>

          {renderListContent()}
        </div>
      </div>
    </div>
  );
}
