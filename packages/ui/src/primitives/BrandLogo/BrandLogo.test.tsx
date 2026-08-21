import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { BrandLogo } from './BrandLogo';

describe('BrandLogo Component', () => {
  it('renders default text and logo image correctly', () => {
    render(<BrandLogo />);
    expect(screen.getByAltText('MAD Entertrainment Logo')).toBeInTheDocument();
    expect(screen.getByText(/MAD/i)).toBeInTheDocument();
    expect(screen.getByText(/Entertrainment/i)).toBeInTheDocument();
  });

  it('renders emblem-only variant without text', () => {
    render(<BrandLogo variant="emblem" />);
    expect(screen.getByAltText('MAD Entertrainment Logo')).toBeInTheDocument();
    expect(screen.queryByText(/Entertrainment/i)).not.toBeInTheDocument();
  });

  it('renders custom text and subtext', () => {
    render(<BrandLogo text="MAD" subtext="Admin" />);
    expect(screen.getByText('MAD')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
