import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner Component', () => {
  it('renders with status role and default aria-label', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('allows custom aria-label override', () => {
    render(<Spinner aria-label="Processing request" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Processing request');
  });
});
