'use client';

import { useState, useCallback, useMemo } from 'react';

export interface UseBulkSelectionOptions<TId extends string = string> {
  /**
   * The IDs visible on the current page.
   * Used to calculate `allSelected` and `indeterminate` states,
   * and as the default targets for `selectAll` if no args provided.
   */
  pageIds?: TId[];
}

export interface UseBulkSelectionReturn<TId extends string = string> {
  selectedIds: Set<TId>;
  selectedCount: number;
  isSelected: (id: TId) => boolean;
  toggle: (id: TId) => void;
  toggleMany: (ids: TId[]) => void;
  selectAll: (ids?: TId[]) => void;
  clearSelection: () => void;
  clearMany: (ids: TId[]) => void;
  allSelected: boolean;
  indeterminate: boolean;
}

export function useBulkSelection<TId extends string = string>({ 
  pageIds = [] 
}: UseBulkSelectionOptions<TId> = {}): UseBulkSelectionReturn<TId> {
  const [selectedIds, setSelectedIds] = useState<Set<TId>>(new Set());

  const isSelected = useCallback((id: TId) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: TId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleMany = useCallback((ids: TId[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      let anyAdded = false;
      let anyDeleted = false;
      
      for (const id of ids) {
        if (next.has(id)) {
          next.delete(id);
          anyDeleted = true;
        } else {
          next.add(id);
          anyAdded = true;
        }
      }
      
      // If we just added some and deleted some, we're returning a new set.
      // If we didn't do anything, return prev to avoid re-renders.
      if (!anyAdded && !anyDeleted) return prev;
      return next;
    });
  }, []);

  const selectAll = useCallback((idsToSelect?: TId[]) => {
    const targets = idsToSelect || pageIds;
    if (!targets.length) return;
    
    setSelectedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of targets) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pageIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const clearMany = useCallback((idsToClear: TId[]) => {
    if (!idsToClear.length) return;
    
    setSelectedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of idsToClear) {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const selectedCount = selectedIds.size;

  const { allSelected, indeterminate } = useMemo(() => {
    if (!pageIds.length) {
      return { allSelected: false, indeterminate: false };
    }
    
    let selectedOnPage = 0;
    for (const id of pageIds) {
      if (selectedIds.has(id)) {
        selectedOnPage++;
      }
    }
    
    const allSelected = selectedOnPage === pageIds.length;
    const indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length;
    
    return { allSelected, indeterminate };
  }, [pageIds, selectedIds]);

  return {
    selectedIds,
    selectedCount,
    isSelected,
    toggle,
    toggleMany,
    selectAll,
    clearSelection,
    clearMany,
    allSelected,
    indeterminate,
  };
}
