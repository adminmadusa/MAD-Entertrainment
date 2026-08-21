import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { TicketsEmptyState } from './TicketsEmptyState';

describe('TicketsEmptyState Component', () => {
  it('renders both Account Holders and Guest Lookup cards', () => {
    render(<TicketsEmptyState onSignIn={vi.fn()} onLookup={vi.fn()} />);

    expect(screen.getByText('Have an Account?')).toBeInTheDocument();
    expect(screen.getByText('Guest Order Lookup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to View All Tickets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lookup Booking Reference/i })).toBeInTheDocument();
  });

  it('triggers onSignIn when clicking the sign in button', () => {
    const handleSignIn = vi.fn();
    render(<TicketsEmptyState onSignIn={handleSignIn} onLookup={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Sign In to View All Tickets/i }));
    expect(handleSignIn).toHaveBeenCalledTimes(1);
  });

  it('triggers onLookup when clicking the guest lookup button', () => {
    const handleLookup = vi.fn();
    render(<TicketsEmptyState onSignIn={vi.fn()} onLookup={handleLookup} />);

    fireEvent.click(screen.getByRole('button', { name: /Lookup Booking Reference/i }));
    expect(handleLookup).toHaveBeenCalledTimes(1);
  });
});
