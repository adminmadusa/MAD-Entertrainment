import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
