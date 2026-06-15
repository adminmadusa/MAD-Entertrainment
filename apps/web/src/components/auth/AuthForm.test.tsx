import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AuthForm } from './AuthForm';

// ─── Mock Auth Provider ───────────────────────────────────────
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockSetOnboardingRequired = vi.fn();

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: mockLogout,
    token: null,
    onboardingRequired: false,
    setOnboardingRequired: mockSetOnboardingRequired,
  }),
}));

// ─── Mock public service endpoints ─────────────────────────────
const mockRequestVerificationCode = vi.fn();
const mockVerifyVerificationCodeOrOTP = vi.fn();
const mockGoogleLogin = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('@/lib/api/public.service', () => ({
  publicRequestVerificationCode: (...args: unknown[]) => mockRequestVerificationCode(...args),
  publicVerifyVerificationCodeOrOTP: (...args: unknown[]) => mockVerifyVerificationCodeOrOTP(...args),
  publicGoogleLogin: (...args: unknown[]) => mockGoogleLogin(...args),
  publicUpdateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

// Mock extractApiError to return whatever error we throw
vi.mock('@/lib/api/client', () => ({
  extractApiError: (err: unknown) => err,
}));

// Mock loadScriptOnce to resolve immediately in tests
vi.mock('@/lib/utils/load-script-once', () => ({
  loadScriptOnce: () => Promise.resolve(),
}));

describe('AuthForm Component Smoke Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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

  const renderComponent = (props: React.ComponentProps<typeof AuthForm>) => {
    const { render } = require('@testing-library/react');
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthForm {...props} />
      </QueryClientProvider>
    );
  };

  describe('Render & UI Design Modes', () => {
    it('should render email login option by default', () => {
      renderComponent({ mode: 'login' });
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with email/i })).toBeInTheDocument();
    });

    it('should render wallet retrieve details when mode is wallet', () => {
      renderComponent({ mode: 'wallet' });
      expect(screen.getByRole('heading', { name: /get your tickets/i })).toBeInTheDocument();
      expect(screen.getByText(/sign in using the email used during booking/i)).toBeInTheDocument();
    });

    it('should render inline compact inputs when mode is checkout', () => {
      renderComponent({ mode: 'checkout' });
      expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument();
    });
  });

  describe('Email Validations', () => {
    it('should show error message when empty email is submitted', async () => {
      renderComponent({ mode: 'login' });
      const emailInput = screen.getByLabelText(/email address/i);
      emailInput.removeAttribute('required'); // Bypass HTML5 validation

      const submitBtn = screen.getByRole('button', { name: /continue with email/i });

      // Click with empty input
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(screen.getByRole('alert')).toHaveTextContent(/email address is required/i);
    });
  });

  describe('OTP Request Flow', () => {
    it('should trigger publicRequestVerificationCode mutation on valid email submit', async () => {
      mockRequestVerificationCode.mockResolvedValueOnce({ message: 'Passcode sent' });
      renderComponent({ mode: 'login' });

      const emailInput = screen.getByLabelText(/email address/i);
      const submitBtn = screen.getByRole('button', { name: /continue with email/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockRequestVerificationCode).toHaveBeenCalledWith('user@example.com');
      // Assert transition to verify step
      expect(await screen.findByRole('heading', { name: /secure login/i })).toBeInTheDocument();
    });
  });

  describe('OTP Verification Flow', () => {
    beforeEach(async () => {
      // Bootstrap the screen to the verify step
      mockRequestVerificationCode.mockResolvedValueOnce({ message: 'Passcode sent' });
      renderComponent({ mode: 'login' });
      const emailInput = screen.getByLabelText(/email address/i);
      const submitBtn = screen.getByRole('button', { name: /continue with email/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
        fireEvent.click(submitBtn);
      });
    });

    it('should disable Verify Code button if passcode is less than 6 digits', async () => {
      const otpInput = screen.getByLabelText(/6-digit passcode/i);
      const verifyBtn = screen.getByRole('button', { name: /verify code/i });

      await act(async () => {
        fireEvent.change(otpInput, { target: { value: '1234' } });
      });
      expect(verifyBtn).toBeDisabled();
    });

    it('should enable Verify Code button and execute verification when 6 digits are provided', async () => {
      mockVerifyVerificationCodeOrOTP.mockResolvedValueOnce({ token: 'jwt_token', user: { email: 'user@example.com' } });
      const otpInput = screen.getByLabelText(/6-digit passcode/i);
      const verifyBtn = screen.getByRole('button', { name: /verify code/i });

      await act(async () => {
        fireEvent.change(otpInput, { target: { value: '123456' } });
      });
      expect(verifyBtn).not.toBeDisabled();

      await act(async () => {
        fireEvent.click(verifyBtn);
      });

      expect(mockVerifyVerificationCodeOrOTP).toHaveBeenCalledWith({
        otp: '123456',
        email: 'user@example.com',
      });
      expect(mockLogin).toHaveBeenCalledWith('jwt_token', { email: 'user@example.com' });
    });

    it('should sanitize pasted string to exactly 6 digits', async () => {
      const otpInput = screen.getByLabelText(/6-digit passcode/i) as HTMLInputElement;

      const clipboardData = {
        getData: () => 'abc 98-76 54 extra text',
      };

      await act(async () => {
        fireEvent.paste(otpInput, { clipboardData });
      });

      expect(otpInput.value).toBe('987654');
    });
  });

  describe('Cooldown Timer & Security Block', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should trigger cooldown lock state on RATE_LIMIT_EXCEEDED error', async () => {
      mockRequestVerificationCode.mockRejectedValueOnce({
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 30,
        message: 'Rate limit hit',
      });

      renderComponent({ mode: 'login' });
      const emailInput = screen.getByLabelText(/email address/i);
      const submitBtn = screen.getByRole('button', { name: /continue with email/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Display warning info message about sent code/cooldown
      expect(screen.getByRole('status')).toHaveTextContent(/verification code sent/i);

      // Verify timer reduces by running timer
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByRole('status')).toHaveTextContent(/00:25/i);
      expect(submitBtn).toBeDisabled();

      // Fast forward past cooldown expiry
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe('Guest Checkout Flow', () => {
    it('should render Guest button and handle callback', async () => {
      const handleGuestContinue = vi.fn();
      renderComponent({ mode: 'checkout', onGuestContinue: handleGuestContinue });

      const guestBtn = screen.getByRole('button', { name: /continue as guest/i });
      expect(guestBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(guestBtn);
      });
      expect(handleGuestContinue).toHaveBeenCalled();
    });
  });

  describe('Google Sign-In Authentication', () => {
    it('should initialize Google GSI accounts script and render button', async () => {
      renderComponent({ mode: 'login' });

      // We wait for the loadGsi async promise queue and its 50ms timeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Check if global google mock initialize has been called
      const globalMock = globalThis as unknown as {
        mockGoogleInitialize: ReturnType<typeof vi.fn>;
        mockGoogleRenderButton: ReturnType<typeof vi.fn>;
      };
      expect(globalMock.mockGoogleInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'google_client_id_placeholder',
          auto_select: false,
        })
      );
      expect(globalMock.mockGoogleRenderButton).toHaveBeenCalled();
    });
  });
});
