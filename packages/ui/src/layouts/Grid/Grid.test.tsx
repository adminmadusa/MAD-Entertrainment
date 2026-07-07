import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { Grid } from './Grid';

describe('Grid Component', () => {
  it('renders grid container with default properties', () => {
    render(<Grid data-testid="grid-el">Grid items</Grid>);
    const grid = screen.getByTestId('grid-el');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1');
  });

  it('renders responsive grid column settings correctly', () => {
    render(<Grid cols={{ base: 1, md: 3, lg: 4 }} data-testid="grid-el" />);
    const grid = screen.getByTestId('grid-el');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-3');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });
});
