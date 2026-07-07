import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { ErrorState } from './ErrorState';

describe('ErrorState Component', () => {
  it('renders title and triggers retry action', () => {
    const handleRetry = vi.fn();
    render(<ErrorState title="Database Offline" onRetry={handleRetry} />);
    expect(screen.getByText('Database Offline')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
