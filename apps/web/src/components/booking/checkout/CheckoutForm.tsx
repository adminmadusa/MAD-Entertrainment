import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckoutDetailsInput } from '@mad/validations';
import { useAuth } from '@/providers/AuthProvider';



import { Event } from '@mad/types';

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
  const [keepUpdated, setKeepUpdated] = useState(false);
  const [sendBestEvents, setSendBestEvents] = useState(false);

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

    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!guestEmail.trim()) errors.guestEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) errors.guestEmail = 'Invalid email format';

    if (!user) {
      const normalizedEmail = guestEmail.trim().toLowerCase();
      const normalizedConfirm = guestEmailConfirm.trim().toLowerCase();
      if (!guestEmailConfirm.trim()) {
        errors.guestEmailConfirm = 'Please confirm your email';
      } else if (normalizedEmail !== normalizedConfirm) {
        errors.guestEmailConfirm = 'Emails do not match';
      }
    }

    if (event?.requireAgeConfirmation && !ageConfirmed) {
      errors.ageConfirmed = 'You must confirm your age to continue';
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

    // Normalize emails to lowercase before submission and persistence to prevent duplicate customer records caused by casing differences.
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      guestEmailConfirm: !user ? guestEmailConfirm.trim().toLowerCase() : undefined,
      guestPhone: guestPhone.trim(),
      keepUpdated,
      sendBestEvents,
      ageConfirmed: event?.requireAgeConfirmation ? ageConfirmed : undefined,
    });
  };

  return (
    <form id="checkout-form" onSubmit={handlePlaceOrderSubmit} className="space-y-4">
      <div className="glass rounded-2xl border border-white/5 p-4 sm:p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
          <h2 className="text-white font-bold text-base">Billing information</h2>
          <span className="text-[10px] text-text-muted uppercase">* Required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="checkout-first-name" className="text-xs text-text-secondary font-medium">First name *</label>
            <input
              id="checkout-first-name"
              type="text"
              value={firstName}
              disabled={isDisabled}
              onChange={(e) => {
                setFirstName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, firstName: '' }));
              }}
              placeholder="First name"
              className={`w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${fieldErrors.firstName ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                }`}
            />
            {fieldErrors.firstName && <p className="text-red-400 text-xs" role="status" aria-live="polite">{fieldErrors.firstName}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="checkout-last-name" className="text-xs text-text-secondary font-medium">Last name *</label>
            <input
              id="checkout-last-name"
              type="text"
              value={lastName}
              disabled={isDisabled}
              onChange={(e) => {
                setLastName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, lastName: '' }));
              }}
              placeholder="Last name"
              className={`w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${fieldErrors.lastName ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                }`}
            />
            {fieldErrors.lastName && <p className="text-red-400 text-xs" role="status" aria-live="polite">{fieldErrors.lastName}</p>}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${!user ? 'md:grid-cols-2' : ''} gap-4`}>
          <div className="space-y-1">
            <label htmlFor="checkout-email" className="text-xs text-text-secondary font-medium">Email address *</label>
            <input
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
              className={`w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-background border text-base lg:text-sm focus:outline-none transition-colors ${user ? 'text-text-muted/60 bg-white/5 cursor-not-allowed border-white/5' : 'text-white bg-background ' + (fieldErrors.guestEmail ? 'border-red-500' : 'border-white/10 focus:border-accent-purple')
                }`}
            />
            {fieldErrors.guestEmail && <p className="text-red-400 text-xs" role="status" aria-live="polite">{fieldErrors.guestEmail}</p>}
            {user && <p className="text-[10px] text-text-muted/60 mt-1">Verified via your connected account.</p>}
          </div>

          {!user && (() => {
            const normalizedEmail = guestEmail.trim().toLowerCase();
            const normalizedConfirm = guestEmailConfirm.trim().toLowerCase();
            const emailsMatch = 
              normalizedEmail.length > 0 && 
              normalizedConfirm.length > 0 && 
              normalizedEmail === normalizedConfirm;

            return (
              <div className="space-y-1">
                <label htmlFor="checkout-email-confirm" className="text-xs text-text-secondary font-medium">Confirm email *</label>
                <input
                  id="checkout-email-confirm"
                  type="email"
                  value={guestEmailConfirm}
                  disabled={isDisabled}
                  onChange={(e) => {
                    setGuestEmailConfirm(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, guestEmailConfirm: '' }));
                  }}
                  placeholder="Confirm email address"
                  className={`w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${fieldErrors.guestEmailConfirm ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                    }`}
                />
                {fieldErrors.guestEmailConfirm && <p className="text-red-400 text-xs" role="status" aria-live="polite">{fieldErrors.guestEmailConfirm}</p>}
                {!fieldErrors.guestEmailConfirm && emailsMatch && (
                  <p className="text-emerald-400 text-xs mt-1 font-semibold" role="status" aria-live="polite">✓ Emails match</p>
                )}
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="checkout-phone" className="text-xs text-text-secondary font-medium">Mobile Number <span className="text-[10px] text-text-muted/60 lowercase">(Optional – used for event updates only)</span></label>
            <input
              id="checkout-phone"
              type="tel"
              value={guestPhone}
              disabled={isDisabled}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className={`w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${fieldErrors.guestPhone ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                }`}
            />
            {fieldErrors.guestPhone && <p className="text-red-400 text-xs">{fieldErrors.guestPhone}</p>}
          </div>

        </div>

        {/* Subscriptions */}
        <div className="space-y-2 pt-3 border-t border-white/5">
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer text-[11px] text-text-secondary leading-normal">
            <input
              type="checkbox"
              checked={keepUpdated}
              disabled={isDisabled}
              onChange={(e) => setKeepUpdated(e.target.checked)}
              className="rounded border-white/10 bg-background accent-accent-purple shrink-0"
            />
            <span>Keep me updated on more events and news from this event organizer.</span>
          </label>
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer text-[11px] text-text-secondary leading-normal">
            <input
              type="checkbox"
              checked={sendBestEvents}
              disabled={isDisabled}
              onChange={(e) => setSendBestEvents(e.target.checked)}
              className="rounded border-white/10 bg-background accent-accent-purple shrink-0"
            />
            <span>Send me emails about the best events happening nearby or online.</span>
          </label>
        </div>

        <p className="text-[11px] text-text-muted leading-relaxed pt-3 border-t border-white/5">
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
          <div className="space-y-1 pt-3 border-t border-white/5">
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer text-sm text-white font-medium leading-normal">
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
            {fieldErrors.ageConfirmed && <p className="text-red-400 text-xs pl-[28px]" role="status" aria-live="polite">{fieldErrors.ageConfirmed}</p>}
          </div>
        )}
      </div>
    </form>
  );
}
