import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { ScrollIndicator } from './ScrollIndicator';

describe('ScrollIndicator Component', () => {
  it('renders correctly', () => {
    render(<ScrollIndicator data-testid="scroll-indicator" />);
    expect(screen.getByTestId('scroll-indicator')).toBeInTheDocument();
    expect(screen.getByText('Scroll')).toBeInTheDocument();
  });
});
