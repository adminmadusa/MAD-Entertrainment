import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { Stack } from './Stack';

describe('Stack Component', () => {
  it('renders flex stack and applies spacing classes', () => {
    render(
      <Stack direction="row" gap="lg" data-testid="stack-el">
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );
    const stack = screen.getByTestId('stack-el');
    expect(stack).toBeInTheDocument();
    expect(stack).toHaveClass('flex-row');
    expect(stack).toHaveClass('gap-6');
  });
});
