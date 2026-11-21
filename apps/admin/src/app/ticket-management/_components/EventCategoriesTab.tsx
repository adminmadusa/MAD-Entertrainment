'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import { CategoryListItem } from './CategoryListItem';
import { DeleteCategoryModal } from './DeleteCategoryModal';
import {
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  type AdminCategory,
} from '@/lib/api/admin/category.service';
import { extractApiError } from '@/lib/api/client';
import { EmptyState, Button } from '@mad/ui';
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
            <CategoryListItem
              key={item._id}
              item={item}
              canMutate={canMutate}
              editingId={editingId}
              editingName={editingName}
              onEditChange={setEditingName}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingId(null)}
              onStartEdit={(cat) => {
                setEditingId(cat._id);
                setEditingName(cat.name);
              }}
              onDeleteTarget={setDeleteTarget}
              isSaving={updateCategoryMutation.isPending}
            />
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
              <Button
                type="submit"
                variant="primary"
                disabled={createCategoryMutation.isPending}
                isLoading={createCategoryMutation.isPending}
                className="w-full"
              >
                Add Entry
              </Button>
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
      <DeleteCategoryModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isPending={deleteCategoryMutation.isPending}
      />
    </div>
  );
}
