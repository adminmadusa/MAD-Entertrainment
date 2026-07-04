import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileEditor } from './ProfileEditor';

const { mockUseAuth, mockLogin, mockLogout, mockSetOnboardingRequired } = vi.hoisted(() => {
  const login = vi.fn();
  const logout = vi.fn();
  const setOnboardingRequired = vi.fn();
  return {
    mockLogin: login,
    mockLogout: logout,
    mockSetOnboardingRequired: setOnboardingRequired,
    mockUseAuth: vi.fn(() => ({
      login,
      logout,
      token: 'jwt_token',
      onboardingRequired: false,
      setOnboardingRequired,
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        mobileNumber: '+15555555555',
        name: 'John Doe',
      },
    })),
  };
});

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUpdateProfile = vi.fn();

vi.mock('@/lib/api/public.service', () => ({
  publicUpdateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

vi.mock('@/lib/api/client', () => ({
  extractApiError: (err: unknown) => err,
}));

describe('ProfileEditor Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
      token: 'jwt_token',
      onboardingRequired: false,
      setOnboardingRequired: mockSetOnboardingRequired,
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        mobileNumber: '+15555555555',
        name: 'John Doe',
      },
    });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProfileEditor />
      </QueryClientProvider>
    );
  };

  it('renders static details correctly in view mode', () => {
    renderComponent();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('+15555555555')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('toggles to edit mode on edit click', async () => {
    renderComponent();
    const editBtn = screen.getByRole('button', { name: /edit profile/i });

    await act(async () => {
      fireEvent.click(editBtn);
    });

    expect(screen.getByRole('heading', { name: /update profile/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/mobile number/i)).toHaveValue('+15555555555');
  });

  it('cancels edit mode on cancel click', async () => {
    renderComponent();
    
    // Toggle edit mode
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    });

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('submits updates and triggers login callback to synchronize context', async () => {
    renderComponent();

    // Toggle edit mode
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    });

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const saveBtn = screen.getByRole('button', { name: /save changes/i });

    await act(async () => {
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    });

    const updatedUser = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'john@example.com',
      mobileNumber: '+15555555555',
      name: 'Jane Smith',
    };
    mockUpdateProfile.mockResolvedValueOnce(updatedUser);

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Smith',
      mobileNumber: '+15555555555',
    });
    expect(mockLogin).toHaveBeenCalledWith('jwt_token', updatedUser);
    expect(screen.queryByRole('heading', { name: /update profile/i })).not.toBeInTheDocument();
  });
});
