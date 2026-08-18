'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import {
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  type AdminCategory,
} from '@/lib/api/admin/category.service';
import { extractApiError } from '@/lib/api/client';
import { Modal, EmptyState } from '@mad/ui';
import { LayoutList } from '@mad/ui/icons';

interface EventCategoriesTabProps {
  canMutate: boolean;
  qc: ReturnType<typeof useQueryClient>;
  showToast: (msg: string) => void;
}

export function EventCategoriesTab({ canMutate, qc, showToast }: EventCategoriesTabProps) {
  const [nameInput, setNameInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  // Categories Queries
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: adminGetCategories,
  });

  const createCategoryMutation = useMutation({
    mutationFn: adminCreateCategory,
    onSuccess: (newCat) => {
      setNameInput('');
      setError('');
      qc.invalidateQueries({ queryKey: ['adminCategories'] });
      showToast(`Category "${newCat.name}" created successfully`);
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminCategory> }) =>
      adminUpdateCategory(id, payload),
    onSuccess: (updatedCat) => {
      setEditingId(null);
      setError('');
      qc.invalidateQueries({ queryKey: ['adminCategories'] });
      showToast(`Category "${updatedCat.name}" updated successfully`);
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: adminDeleteCategory,
    onSuccess: () => {
      const deletedName = deleteTarget?.name;
      setDeleteTarget(null);
      setError('');
      qc.invalidateQueries({ queryKey: ['adminCategories'] });
      showToast(deletedName ? `Category "${deletedName}" deleted successfully` : 'Category deleted successfully');
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nameInput.trim()) return;
    createCategoryMutation.mutate({ name: nameInput.trim() });
  };

  const handleSaveEdit = (id: string) => {
    setError('');
    if (!editingName.trim()) return;
    updateCategoryMutation.mutate({ id, payload: { name: editingName.trim() } });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setError('');
    deleteCategoryMutation.mutate(deleteTarget._id);
  };

  const renderListContent = () => {
    if (loadingCategories) {
      return (
        <div className="p-12 text-center text-text-muted text-sm animate-pulse">Loading categories...</div>
      );
    }

    if (categories.length === 0) {
      return (
        <EmptyState
          variant="card"
          icon={<LayoutList />}
          title="No custom categories defined yet."
          description="Add one using the form on the left!"
        />
      );
    }

    return (
      <div className="divide-y divide-border-subtle/50">
        <AnimatePresence>
          {categories.map((item) => (
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
                    aria-label={`Edit category name for ${item.name}`}
                  />
                  <button
                    onClick={() => handleSaveEdit(item._id)}
                    disabled={updateCategoryMutation.isPending}
                    className="px-3 py-1.5 bg-accent-purple/20 text-accent-purple-light text-xs font-bold rounded-lg hover:bg-accent-purple/30 transition-colors disabled:opacity-60"
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

              {canMutate && editingId !== item._id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(item._id);
                      setEditingName(item.name);
                    }}
                    className="px-3 py-1.5 bg-white/5 text-text-secondary hover:text-white text-xs font-bold rounded-lg transition-colors border border-white/5"
                    aria-label={`Edit ${item.name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 text-xs font-bold rounded-lg transition-colors"
                    aria-label={`Delete ${item.name}`}
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
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          aria-live="polite"
          className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
        >
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Quick Add Form */}
        {canMutate && (
          <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
            <div>
              <h2 className="text-white font-semibold">Add Custom Category</h2>
              <p className="text-text-muted text-xs mt-0.5">Create dynamic event categories for selection</p>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label htmlFor="category-name-input" className="text-text-secondary text-xs font-semibold block mb-1.5">
                  Category Name
                </label>
                <input
                  id="category-name-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Pool Party"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={createCategoryMutation.isPending}
                className="w-full py-2.5 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
              >
                {createCategoryMutation.isPending ? 'Adding...' : 'Add Entry'}
              </button>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div
          className={`${
            canMutate ? 'md:col-span-2' : 'md:col-span-3'
          } glass rounded-2xl border border-border-subtle overflow-hidden`}
        >
          <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center">
            <h2 className="text-white font-semibold">Active Categories</h2>
            <span className="text-xs bg-accent-purple/10 text-accent-purple-light font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {categories.length} Total
            </span>
          </div>

          {renderListContent()}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        showCloseButton={false}
        closeOnBackdropClick={true}
        ariaLabelledBy="delete-category-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-sm"
      >
        <h2 id="delete-category-modal-title" className="text-white font-bold text-lg mb-2">
          Delete Category?
        </h2>
        <p className="text-text-secondary text-sm mb-5">
          Are you sure you want to delete <span className="text-white font-semibold">{deleteTarget?.name}</span>? Past events and bookings using it will remain preserved.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleteCategoryMutation.isPending}
            className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {deleteCategoryMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
