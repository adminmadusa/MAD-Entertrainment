import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders content correctly', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
