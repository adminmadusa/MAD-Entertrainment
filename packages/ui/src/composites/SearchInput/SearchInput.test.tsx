import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SearchInput } from './SearchInput';

describe('SearchInput Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with default searchbox role and placeholder', () => {
    render(<SearchInput placeholder="Search records..." />);
    const input = screen.getByRole('searchbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search records...');
  });

  it('calls onSearch after debounce interval', () => {
    const onSearch = vi.fn();
    render(<SearchInput debounceMs={300} onSearch={onSearch} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'test query' } });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('shows clear button and clears input when clicked', () => {
    const onClear = vi.fn();
    const onSearch = vi.fn();
    render(<SearchInput defaultValue="initial" onClear={onClear} onSearch={onSearch} />);

    const clearButton = screen.getByRole('button', { name: /Clear search/i });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(onClear).toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('clears input on Escape key', () => {
    render(<SearchInput defaultValue="hello" />);
    const input = screen.getByRole('searchbox');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
  });
});
