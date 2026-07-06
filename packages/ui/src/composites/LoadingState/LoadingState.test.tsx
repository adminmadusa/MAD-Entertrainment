import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from './LoadingState';

describe('LoadingState Component', () => {
  it('renders loading content with aria-live and aria-busy attributes', () => {
    render(<LoadingState label="Fetching profiles..." />);
    const container = screen.getByText('Fetching profiles...').parentElement;
    expect(container).toHaveAttribute('aria-live', 'polite');
    expect(container).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Fetching profiles...' })).toBeInTheDocument();
  });
});
