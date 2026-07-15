import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { Progress } from './Progress';

describe('Progress Component', () => {
  it('renders progressbar correctly with value attributes', () => {
    render(<Progress value={45} label="Uploading file" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '45');
    expect(screen.getByText('Uploading file')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });
});
