import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { MobileNavigation } from './MobileNavigation';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    onClick,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

describe('MobileNavigation Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    dynamicLinks: [
      { label: 'Events', href: '/events' },
      { label: 'My Tickets', href: '/tickets' },
    ],
    isAuthenticated: false,
    firstName: '',
    handleLogout: vi.fn(),
    openAuthModal: vi.fn(),
  };

  it('renders links when open', () => {
    render(<MobileNavigation {...defaultProps} />);
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('My Tickets')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Book Now')).toBeInTheDocument();
  });

  it('calls onClose when a link is clicked', () => {
    const onClose = vi.fn();
    render(<MobileNavigation {...defaultProps} onClose={onClose} />);
    const eventsLink = screen.getByText('Events');
    fireEvent.click(eventsLink);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls openAuthModal and onClose when Login is clicked', () => {
    const onClose = vi.fn();
    const openAuthModal = vi.fn();
    render(
      <MobileNavigation
        {...defaultProps}
        onClose={onClose}
        openAuthModal={openAuthModal}
      />
    );
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openAuthModal).toHaveBeenCalledTimes(1);
  });

  it('renders authenticated user menu and calls handleLogout', () => {
    const handleLogout = vi.fn();
    render(
      <MobileNavigation
        {...defaultProps}
        isAuthenticated={true}
        firstName="John"
        handleLogout={handleLogout}
      />
    );
    expect(screen.getByText('Hi, John')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });
});
