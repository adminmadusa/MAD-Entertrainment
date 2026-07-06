import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './Label';

describe('Label Component', () => {
  it('renders text content correctly', () => {
    render(<Label>Email Address</Label>);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('renders required asterisk when required is true', () => {
    render(<Label required>Name</Label>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders inline hint text correctly', () => {
    render(<Label hint="Optional">Phone</Label>);
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });
});
