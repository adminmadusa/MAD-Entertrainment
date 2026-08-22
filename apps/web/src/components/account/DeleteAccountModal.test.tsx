import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeleteAccountModal } from './DeleteAccountModal';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockLogout = vi.fn();
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

const mockPublicDeleteAccount = vi.fn();
vi.mock('@/lib/api/public.service', () => ({
  publicDeleteAccount: (...args: unknown[]) => mockPublicDeleteAccount(...args),
}));

vi.mock('@/lib/api/client', () => ({
  extractApiError: (err: unknown) => err,
}));

describe('DeleteAccountModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    userEmail: 'user@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with warnings, consequences, and disabled delete button initially', () => {
    render(<DeleteAccountModal {...defaultProps} />);

    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByText(/Permanent & Irreversible/i)).toBeInTheDocument();
    expect(screen.getByText(/Immediate Signout:/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Event Tickets:/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /Permanently Delete Account/i });
    expect(deleteBtn).toBeDisabled();
  });

  it('enables the delete button when user types "DELETE"', () => {
    render(<DeleteAccountModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Type "DELETE" or your email/i);
    fireEvent.change(input, { target: { value: 'DELETE' } });

    const deleteBtn = screen.getByRole('button', { name: /Permanently Delete Account/i });
    expect(deleteBtn).not.toBeDisabled();
  });

  it('enables the delete button when user types their exact email', () => {
    render(<DeleteAccountModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Type "DELETE" or your email/i);
    fireEvent.change(input, { target: { value: 'user@example.com' } });

    const deleteBtn = screen.getByRole('button', { name: /Permanently Delete Account/i });
    expect(deleteBtn).not.toBeDisabled();
  });

  it('submits deletion request, calls logout, closes modal, and redirects to home', async () => {
    mockPublicDeleteAccount.mockResolvedValueOnce({ success: true });
    mockLogout.mockResolvedValueOnce(undefined);

    render(<DeleteAccountModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Type "DELETE" or your email/i);
    fireEvent.change(input, { target: { value: 'DELETE' } });

    const deleteBtn = screen.getByRole('button', { name: /Permanently Delete Account/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockPublicDeleteAccount).toHaveBeenCalledWith('DELETE');
      expect(mockLogout).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
