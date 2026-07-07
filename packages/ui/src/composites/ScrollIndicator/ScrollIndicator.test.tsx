import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScrollIndicator } from './ScrollIndicator';

describe('ScrollIndicator Component', () => {
  it('renders correctly', () => {
    render(<ScrollIndicator data-testid="scroll-indicator" />);
    expect(screen.getByTestId('scroll-indicator')).toBeInTheDocument();
    expect(screen.getByText('Scroll')).toBeInTheDocument();
  });
});
