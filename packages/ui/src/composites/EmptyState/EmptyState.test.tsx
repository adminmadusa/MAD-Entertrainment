import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  it('renders title and description correctly', () => {
    render(<EmptyState title="No items found" description="Try creating one" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('Try creating one')).toBeInTheDocument();
  });
});
