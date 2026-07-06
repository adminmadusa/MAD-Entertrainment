import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip Component', () => {
  it('does not render tooltip bubble initially', () => {
    render(
      <Tooltip content="Tooltip message">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders tooltip bubble on mouse enter', async () => {
    render(
      <Tooltip content="Tooltip message">
        <button>Hover me</button>
      </Tooltip>
    );
    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip message');
  });
});
