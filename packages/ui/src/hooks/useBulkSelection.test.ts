/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useBulkSelection } from './useBulkSelection';

describe('useBulkSelection', () => {
  it('initializes with empty selection', () => {
    const { result } = renderHook(() => useBulkSelection());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.allSelected).toBe(false);
    expect(result.current.indeterminate).toBe(false);
  });

  it('toggles individual items', () => {
    const { result } = renderHook(() => useBulkSelection());
    
    act(() => {
      result.current.toggle('item-1');
    });
    
    expect(result.current.isSelected('item-1')).toBe(true);
    expect(result.current.selectedCount).toBe(1);
    
    act(() => {
      result.current.toggle('item-1');
    });
    
    expect(result.current.isSelected('item-1')).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('toggles multiple items', () => {
    const { result } = renderHook(() => useBulkSelection());
    
    act(() => {
      result.current.toggleMany(['item-1', 'item-2']);
    });
    
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected('item-1')).toBe(true);
    expect(result.current.isSelected('item-2')).toBe(true);
    
    act(() => {
      result.current.toggleMany(['item-2', 'item-3']);
    });
    
    // item-2 should be removed, item-3 should be added
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected('item-1')).toBe(true);
    expect(result.current.isSelected('item-2')).toBe(false);
    expect(result.current.isSelected('item-3')).toBe(true);
  });

  it('selects all items on page', () => {
    const pageIds = ['item-1', 'item-2', 'item-3'];
    const { result } = renderHook(() => useBulkSelection({ pageIds }));
    
    act(() => {
      result.current.selectAll();
    });
    
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.allSelected).toBe(true);
    expect(result.current.indeterminate).toBe(false);
  });

  it('selects explicit items', () => {
    const { result } = renderHook(() => useBulkSelection());
    
    act(() => {
      result.current.selectAll(['item-1', 'item-2']);
    });
    
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected('item-1')).toBe(true);
  });

  it('clears all selection', () => {
    const { result } = renderHook(() => useBulkSelection());
    
    act(() => {
      result.current.selectAll(['item-1', 'item-2']);
    });
    
    expect(result.current.selectedCount).toBe(2);
    
    act(() => {
      result.current.clearSelection();
    });
    
    expect(result.current.selectedCount).toBe(0);
  });

  it('clears specific items', () => {
    const { result } = renderHook(() => useBulkSelection());
    
    act(() => {
      result.current.selectAll(['item-1', 'item-2', 'item-3']);
    });
    
    act(() => {
      result.current.clearMany(['item-1', 'item-3']);
    });
    
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelected('item-2')).toBe(true);
  });

  it('calculates indeterminate and allSelected based on pageIds', () => {
    const { result, rerender } = renderHook(
      (props: { pageIds: string[] }) => useBulkSelection(props),
      { initialProps: { pageIds: ['item-1', 'item-2'] } }
    );
    
    // 0/2 selected
    expect(result.current.allSelected).toBe(false);
    expect(result.current.indeterminate).toBe(false);
    
    act(() => {
      result.current.toggle('item-1');
    });
    
    // 1/2 selected
    expect(result.current.allSelected).toBe(false);
    expect(result.current.indeterminate).toBe(true);
    
    act(() => {
      result.current.toggle('item-2');
    });
    
    // 2/2 selected
    expect(result.current.allSelected).toBe(true);
    expect(result.current.indeterminate).toBe(false);
    
    // Simulate pagination - page 2
    rerender({ pageIds: ['item-3', 'item-4'] });
    
    // Items 1 and 2 are selected, but they are not on this page
    expect(result.current.allSelected).toBe(false);
    expect(result.current.indeterminate).toBe(false);
  });
});
