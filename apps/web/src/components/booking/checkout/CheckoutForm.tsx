import Link from 'next/link';
import { useEffect, useState } from 'react';

import { mapZodErrorToFields } from '@/lib/validation/mapZodError';
import { useAuth } from '@/providers/AuthProvider';
import type { Event } from '@mad/types';
import { FormField, Input } from '@mad/ui';
import { CheckoutDetailsInput, checkoutDetailsSchema } from '@mad/validations';

interface CheckoutFormProps {
  event?: Event | null;
  isExpired: boolean;
  isDisabled: boolean;
  onSubmit: (details: CheckoutDetailsInput) => void;
  onErrorSet: (err: string) => void;
}

export function CheckoutForm({ event, isExpired, isDisabled, onSubmit, onErrorSet }: CheckoutFormProps) {
  const { user } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestEmailConfirm, setGuestEmailConfirm] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto-fill billing fields from authenticated session user (Eventbrite-style)
  useEffect(() => {
    if (user && !hasPrefilled) {
      let fName = '';
      let lName = '';
      if (user.name) {
        const parts = user.name.trim().split(/\s+/);
        fName = parts[0] || '';
        lName = parts.slice(1).join(' ') || '';
      }
      setFirstName(fName);
      setLastName(lName);
      setGuestEmail(user.email || '');
      setGuestPhone(user.phone || '');
      setHasPrefilled(true);
    } else if (!user && hasPrefilled) {
      setFirstName('');
      setLastName('');
      setGuestEmail('');
      setGuestEmailConfirm('');
      setGuestPhone('');
      setHasPrefilled(false);
    }
  }, [user, hasPrefilled]);

  const handlePlaceOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      onErrorSet('Your booking reservation has expired. Please start a new booking.');
      return;
    }
    onErrorSet('');
    setFieldErrors({});

    // 1. Normalize data
    const cleanedData: CheckoutDetailsInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      guestPhone: guestPhone.trim(),
      keepUpdated: false,
      sendBestEvents: false,
      ageConfirmed: event?.requireAgeConfirmation ? ageConfirmed : undefined,
    };

    // 2. Validate using Zod schema
    const errors: Record<string, string> = {};
    const result = checkoutDetailsSchema.safeParse(cleanedData);
    if (!result.success) {
      Object.assign(errors, mapZodErrorToFields(result.error));
    }

    // 3. Keep guestEmail and guestEmailConfirm local matching checks (UX validation)
    if (!user) {
      const normalizedConfirm = guestEmailConfirm.trim().toLowerCase();
      if (!guestEmailConfirm.trim()) {
        errors.guestEmailConfirm = 'Please confirm your email';
      } else if (cleanedData.guestEmail !== normalizedConfirm) {
        errors.guestEmailConfirm = 'Emails do not match';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);

      const firstErrorKey = Object.keys(errors)[0];
      let elementId = '';
      if (firstErrorKey === 'firstName') elementId = 'checkout-first-name';
      else if (firstErrorKey === 'lastName') elementId = 'checkout-last-name';
      else if (firstErrorKey === 'guestEmail') elementId = 'checkout-email';
      else if (firstErrorKey === 'guestEmailConfirm') elementId = 'checkout-email-confirm';
      else if (firstErrorKey === 'ageConfirmed') elementId = 'checkout-age-confirm';

      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          element.focus();
        }
      }
      return;
    }

    // 4. Submit clean data
    onSubmit(cleanedData);
  };


  return (
    <form id="checkout-form" onSubmit={handlePlaceOrderSubmit} className="space-y-3">
      <div className="glass rounded-xl border border-white/5 p-3.5 sm:p-4 space-y-3">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <h2 className="text-white font-bold text-sm sm:text-base">Billing information</h2>
          <span className="text-[10px] text-text-muted uppercase">* Required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="First name" htmlFor="checkout-first-name" required error={fieldErrors.firstName}>
            <Input
              id="checkout-first-name"
              type="text"
              value={firstName}
              disabled={isDisabled}
              onChange={(e) => {
                setFirstName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, firstName: '' }));
              }}
              placeholder="First name"
              className="h-10 text-sm"
            />
          </FormField>
          <FormField label="Last name" htmlFor="checkout-last-name" required error={fieldErrors.lastName}>
            <Input
              id="checkout-last-name"
              type="text"
              value={lastName}
              disabled={isDisabled}
              onChange={(e) => {
                setLastName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, lastName: '' }));
              }}
              placeholder="Last name"
              className="h-10 text-sm"
            />
          </FormField>
        </div>

        <div className={`grid grid-cols-1 ${!user ? 'md:grid-cols-2' : ''} gap-3`}>
          <FormField
            label="Email address"
            htmlFor="checkout-email"
            required
            error={fieldErrors.guestEmail}
            hint={user ? 'Verified via your connected account.' : undefined}
          >
            <Input
              id="checkout-email"
              type="email"
              value={guestEmail}
              disabled={isDisabled || !!user}
              readOnly={!!user}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, guestEmail: '', guestEmailConfirm: '' }));
              }}
              placeholder="email@example.com"
              className={user ? 'h-10 text-sm text-text-muted/60 bg-white/5 cursor-not-allowed border-white/5' : 'h-10 text-sm'}
            />
          </FormField>

          {!user && (() => {
            const normalizedEmail = guestEmail.trim().toLowerCase();
            const normalizedConfirm = guestEmailConfirm.trim().toLowerCase();
            const emailsMatch =
              normalizedEmail.length > 0 &&
              normalizedConfirm.length > 0 &&
              normalizedEmail === normalizedConfirm;

            return (
              <FormField label="Confirm email" htmlFor="checkout-email-confirm" required error={fieldErrors.guestEmailConfirm}>
                <Input
                  id="checkout-email-confirm"
                  type="email"
                  value={guestEmailConfirm}
                  disabled={isDisabled}
                  onChange={(e) => {
                    setGuestEmailConfirm(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, guestEmailConfirm: '' }));
                  }}
                  placeholder="Confirm email address"
                  className="h-10 text-sm"
                />
                {!fieldErrors.guestEmailConfirm && emailsMatch && (
                  <p className="text-emerald-400 text-[11px] mt-0.5 font-semibold" role="status" aria-live="polite">✓ Emails match</p>
                )}
              </FormField>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Mobile Number (Optional)" htmlFor="checkout-phone" error={fieldErrors.guestPhone}>
            <Input
              id="checkout-phone"
              type="tel"
              value={guestPhone}
              disabled={isDisabled}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="h-10 text-sm"
            />
          </FormField>
        </div>

        <p className="text-[10px] sm:text-[11px] text-text-muted leading-relaxed pt-2 border-t border-white/5">
          By completing your booking, you agree to our{' '}
          <Link href="/legal/terms" className="text-accent-purple hover:underline font-semibold">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="text-accent-purple hover:underline font-semibold">
            Privacy Policy
          </Link>
          .
        </p>

        {/* Age Confirmation Requirement */}
        {event?.requireAgeConfirmation && (
          <div className="space-y-1 pt-2 border-t border-white/5">
            <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer text-xs sm:text-sm text-white font-medium leading-normal">
              <input
                id="checkout-age-confirm"
                type="checkbox"
                checked={ageConfirmed}
                disabled={isDisabled}
                onChange={(e) => {
                  setAgeConfirmed(e.target.checked);
                  if (e.target.checked) {
                    setFieldErrors((prev) => ({ ...prev, ageConfirmed: '' }));
                  }
                }}
                className={`w-4 h-4 rounded bg-background accent-accent-purple shrink-0 ${fieldErrors.ageConfirmed ? 'border border-red-500' : 'border-white/20'
                  }`}
              />
              <span>I confirm that I am {event?.ageRestriction || 18} years of age or older and legally eligible to attend this event.</span>
            </label>
            {fieldErrors.ageConfirmed && <p className="text-red-400 text-xs pl-[24px]" role="status" aria-live="polite">{fieldErrors.ageConfirmed}</p>}
          </div>
        )}
      </div>
    </form>
  );
}
