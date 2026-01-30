import React, { useState, useCallback } from 'react';
import { haptics } from '../services/infrastructure/HapticService';

export interface SelectionManager<T> {
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectItems: (ids: string[]) => void;
  deselectItems: (ids: string[]) => void;
  clearSelection: () => void;
  handleRowClick: (e: React.MouseEvent, item: T, index: number) => void;
  isAllSelected: boolean;
  toggleAll: () => void;
  count: number;
}

/**
 * useSelection
 * Generic engine for multi-node selection with Shift+Click support.
 * Integrates directly with the Sensory Layer (Haptics).
 */
export function useSelection<T extends { id: string }>(
  data: T[], 
  isReadOnly: boolean = false
): SelectionManager<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const toggleSelection = useCallback((id: string) => {
    if (isReadOnly) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        haptics.click('light');
      }
      return next;
    });
  }, [isReadOnly]);

  const selectItems = useCallback((ids: string[]) => {
    if (isReadOnly) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    haptics.click('light');
  }, [isReadOnly]);

  const deselectItems = useCallback((ids: string[]) => {
    if (isReadOnly) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, [isReadOnly]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const handleRowClick = useCallback((e: React.MouseEvent, item: T, _index: number) => {
    if (isReadOnly) return;
    
    // Prevent selection trigger on action elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input[type="checkbox"]') || target.closest('a') || target.closest('select')) {
      return;
    }

    // Resolve global index for Shift+Click stability in nested/accordion views
    const globalIndex = data.findIndex(i => i.id === item.id);
    if (globalIndex === -1) return;

    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, globalIndex);
      const end = Math.max(lastSelectedIndex, globalIndex);
      const rangeIds = data.slice(start, end + 1).map(i => i.id);
      
      setSelectedIds(prev => {
        const next = new Set(prev);
        rangeIds.forEach(id => next.add(id));
        haptics.click('light');
        return next;
      });
    } else {
      toggleSelection(item.id);
      setLastSelectedIndex(globalIndex);
    }
  }, [data, lastSelectedIndex, toggleSelection, isReadOnly]);

  const isAllSelected = data.length > 0 && data.every(i => selectedIds.has(i.id));

  const toggleAll = useCallback(() => {
    if (isReadOnly) return;
    if (isAllSelected) {
      clearSelection();
    } else {
      setSelectedIds(new Set(data.map(i => i.id)));
      haptics.click('light');
    }
  }, [data, isAllSelected, clearSelection, isReadOnly]);

  return {
    selectedIds,
    toggleSelection,
    selectItems,
    deselectItems,
    clearSelection,
    handleRowClick,
    isAllSelected,
    toggleAll,
    count: selectedIds.size
  };
}