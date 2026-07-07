import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { Drawer } from './Drawer';

describe('Drawer Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <Drawer isOpen={false} onClose={vi.fn()}>
        <div>Drawer Content</div>
      </Drawer>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders content when open', () => {
    render(
      <Drawer isOpen={true} title="Menu options" onClose={vi.fn()}>
        <div>Drawer Content</div>
      </Drawer>
    );
    expect(screen.getByText('Menu options')).toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  it('closes when close button clicked', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose}>
        <div>Drawer Content</div>
      </Drawer>
    );
    const closeBtn = screen.getByRole('button', { name: 'Close drawer' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
