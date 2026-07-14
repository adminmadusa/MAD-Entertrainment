import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { Modal } from './Modal';

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders children correctly when open', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('renders close button and fires onClose when clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} showCloseButton onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>
    );
    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders with default centered presentation', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    const dialogContent = screen.getByRole('dialog');
    // Centered presentation should not have bottom-sheet specific classes
    expect(dialogContent.className).not.toContain('max-h-[calc(100dvh-env(safe-area-inset-top))]');
    expect(dialogContent.className).toContain('rounded-2xl');
  });

  it('renders with bottom-sheet presentation', () => {
    render(
      <Modal isOpen={true} presentation="bottom-sheet" onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    const dialogContent = screen.getByRole('dialog');
    // Bottom-sheet presentation should apply mobile-first bottom sheet classes
    expect(dialogContent.className).toContain('rounded-t-2xl');
    expect(dialogContent.className).toContain('overflow-y-auto');
  });

  it('respects swipe-to-close disabled by default', () => {
    render(
      <Modal isOpen={true} presentation="bottom-sheet" onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    const dialogContent = screen.getByRole('dialog');
    // We expect it to not throw, and just not handle touch events since it's disabled.
    fireEvent.touchStart(dialogContent, { touches: [{ clientY: 100 }] });
  });
});
