import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { IconButton } from './IconButton';

describe('IconButton Component', () => {
  it('enforces aria-label and renders correctly', () => {
    render(<IconButton aria-label="Close dialog">X</IconButton>);
    const button = screen.getByRole('button', { name: 'Close dialog' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('X');
  });
});
