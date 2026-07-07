import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { Alert } from './Alert';

describe('Alert Component', () => {
  it('renders alert title and contents', () => {
    render(<Alert title="System Update">Applying changes now.</Alert>);
    expect(screen.getByText('System Update')).toBeInTheDocument();
    expect(screen.getByText('Applying changes now.')).toBeInTheDocument();
  });

  it('triggers onDismiss when close button clicked', () => {
    const handleDismiss = vi.fn();
    render(<Alert onDismiss={handleDismiss}>Operation succeeded</Alert>);
    const closeBtn = screen.getByRole('button', { name: 'Dismiss alert' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
