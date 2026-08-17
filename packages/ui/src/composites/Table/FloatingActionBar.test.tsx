/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FloatingActionBar } from './FloatingActionBar';
import type { BulkActionConfig } from '@mad/types';

describe('FloatingActionBar', () => {
  const mockOnClearSelection = vi.fn();
  const mockOnAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is hidden when selectedCount is 0', () => {
    render(<FloatingActionBar selectedCount={0} onClearSelection={mockOnClearSelection} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('opacity-0');
    expect(toolbar).toHaveClass('pointer-events-none');
  });

  it('is visible when selectedCount > 0', () => {
    render(<FloatingActionBar selectedCount={3} onClearSelection={mockOnClearSelection} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('opacity-100');
    expect(toolbar).toHaveClass('pointer-events-auto');
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('calls onClearSelection when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<FloatingActionBar selectedCount={2} onClearSelection={mockOnClearSelection} />);

    await user.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders children for backwards compatibility', () => {
    render(
      <FloatingActionBar selectedCount={1} onClearSelection={mockOnClearSelection}>
        <button data-testid="custom-action">Custom Action</button>
      </FloatingActionBar>
    );

    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  describe('with actions prop', () => {
    const actions: BulkActionConfig[] = [
      { id: 'delete', label: 'Delete', variant: 'destructive', danger: true },
      { id: 'archive', label: 'Archive' }
    ];

    it('renders actions correctly', () => {
      render(
        <FloatingActionBar
          selectedCount={1}
          onClearSelection={mockOnClearSelection}
          actions={actions}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    });

    it('calls onAction with correct id when action is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FloatingActionBar
          selectedCount={1}
          onClearSelection={mockOnClearSelection}
          actions={actions}
          onAction={mockOnAction}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(mockOnAction).toHaveBeenCalledWith('delete');
    });

    it('disables actions when phase is loading or confirming', () => {
      render(
        <FloatingActionBar
          selectedCount={1}
          onClearSelection={mockOnClearSelection}
          actions={actions}
          phase="loading"
        />
      );

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /clear selection/i })).toBeDisabled();
    });

    it('shows loading label during loading phase', () => {
      const actionsWithLoading: BulkActionConfig[] = [
        { id: 'delete', label: 'Delete', loadingLabel: 'Deleting...' }
      ];

      render(
        <FloatingActionBar
          selectedCount={1}
          onClearSelection={mockOnClearSelection}
          actions={actionsWithLoading}
          phase="loading"
        />
      );

      expect(screen.getByRole('button', { name: 'Deleting...' })).toBeInTheDocument();
    });

    it('renders progress text when provided', () => {
      render(
        <FloatingActionBar
          selectedCount={5}
          onClearSelection={mockOnClearSelection}
          actions={actions}
          phase="loading"
          progress={{ actionId: 'delete', completed: 2, total: 5, failed: 0 }}
        />
      );

      expect(screen.getByText('2 / 5')).toBeInTheDocument();
    });
  });
});
