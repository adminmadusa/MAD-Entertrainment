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

  it('triggers onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Drawer isOpen={true} onClose={handleClose} showBackdrop={true} closeOnBackdropClick={true}>
        <div>Drawer Content</div>
      </Drawer>
    );
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  it('locks body scroll on mount and cleanly restores on unmount and repeated toggling', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <Drawer isOpen={true} onClose={handleClose} lockScroll={true}>
        <div>Drawer Content</div>
      </Drawer>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Drawer isOpen={false} onClose={handleClose} lockScroll={true}>
        <div>Drawer Content</div>
      </Drawer>
    );
    expect(document.body.style.overflow).toBe('');

    // Reopen
    rerender(
      <Drawer isOpen={true} onClose={handleClose} lockScroll={true}>
        <div>Drawer Content</div>
      </Drawer>
    );
    expect(document.body.style.overflow).toBe('hidden');

    // Reclose
    rerender(
      <Drawer isOpen={false} onClose={handleClose} lockScroll={true}>
        <div>Drawer Content</div>
      </Drawer>
    );
    expect(document.body.style.overflow).toBe('');
  });
});
