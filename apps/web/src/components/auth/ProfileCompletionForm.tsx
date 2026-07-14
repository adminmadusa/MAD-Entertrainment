'use client';

import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';

import { extractApiError } from '@/lib/api/client';
import { publicUpdateProfile } from '@/lib/api/public.service';
import { mapZodErrorToFields } from '@/lib/validation/mapZodError';
import { useAuth } from '@/providers/AuthProvider';
import type { AuthUser } from '@/types/auth';
import { Button, Alert, FormField, Input } from '@mad/ui';
import { updateProfileSchema, normalizePhone } from '@mad/validations';

interface ProfileCompletionFormProps {
  mode?: 'onboarding' | 'edit';
  initialFirstName?: string;
  initialLastName?: string;
  initialMobileNumber?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProfileCompletionForm({
  mode = 'onboarding',
  initialFirstName = '',
  initialLastName = '',
  initialMobileNumber = '',
  onSuccess,
  onCancel,
}: ProfileCompletionFormProps) {
  const { token, login, setOnboardingRequired } = useAuth();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [mobileNumber, setMobileNumber] = useState(initialMobileNumber);
  const [validationError, setValidationError] = useState('');
  const [onboardError, setOnboardError] = useState('');

  const updateProfileMutation = useMutation<AuthUser, Error, { firstName: string; lastName: string; mobileNumber?: string }>({
    mutationFn: (payload) => publicUpdateProfile(payload),
    onSuccess: (updatedUser) => {
      login(token!, updatedUser);
      if (mode === 'onboarding') {
        setOnboardingRequired(false);
      }
      setOnboardError('');
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setOnboardError(apiErr.message || 'Account details completion failed. Please try again.');
    },
  });

  const isPending = updateProfileMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setOnboardError('');

    // 1. Normalize
    const cleanedData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobileNumber: normalizePhone(mobileNumber),
    };

    // 2. Validate using Zod schema
    const result = updateProfileSchema.safeParse(cleanedData);
    if (!result.success) {
      const errors = mapZodErrorToFields(result.error);
      const firstError = Object.values(errors)[0];
      setValidationError(firstError || 'Invalid profile information');
      return;
    }

    // 3. Submit
    updateProfileMutation.mutate({
      firstName: cleanedData.firstName,
      lastName: cleanedData.lastName,
      mobileNumber: cleanedData.mobileNumber || undefined,
    });
  };

  const displayError = validationError || onboardError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="text-center">
        <h2 id="auth-modal-title" className="text-xl font-bold text-white">
          {mode === 'edit' ? 'Update Profile' : 'Complete Your Account Details'}
        </h2>
        <p className="text-xs text-text-muted mt-1">
          {mode === 'edit'
            ? 'Update your personal and contact details below.'
            : 'Please provide your name to complete your account registration.'}
        </p>
      </div>

      {displayError && (
        <Alert variant="danger" className="animate-in fade-in duration-300">
          {displayError}
        </Alert>
      )}

      <div className="space-y-3 sm:space-y-4">
        <FormField label="First Name" htmlFor="firstName" required>
          <Input
            id="firstName"
            type="text"
            required
            autoComplete="given-name"
            disabled={isPending}
            enterKeyHint="next"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
          />
        </FormField>

        <FormField label="Last Name" htmlFor="lastName" required>
          <Input
            id="lastName"
            type="text"
            required
            autoComplete="family-name"
            disabled={isPending}
            enterKeyHint="next"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </FormField>

        <FormField label="Mobile Number" htmlFor="mobileNumber" hint="Include country code (e.g. +91)">
          <Input
            id="mobileNumber"
            type="tel"
            autoComplete="tel"
            disabled={isPending}
            enterKeyHint="done"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="+919876543210"
          />
        </FormField>
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          disabled={isPending}
          isLoading={isPending}
        >
          {mode === 'edit' ? 'Save Changes' : 'Continue'}
        </Button>

        {onCancel && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="text-xs text-text-muted hover:text-white transition-colors duration-200 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded-md px-1"
            >
              {mode === 'edit' ? 'Cancel' : 'Cancel and Log Out'}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
