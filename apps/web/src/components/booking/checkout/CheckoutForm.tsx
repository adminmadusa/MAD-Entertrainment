import { useState } from 'react';
import { CheckoutDetailsInput } from '@mad/validations';

const MONTHS = [
  { name: 'January', value: '01' },
  { name: 'February', value: '02' },
  { name: 'March', value: '03' },
  { name: 'April', value: '04' },
  { name: 'May', value: '05' },
  { name: 'June', value: '06' },
  { name: 'July', value: '07' },
  { name: 'August', value: '08' },
  { name: 'September', value: '09' },
  { name: 'October', value: '10' },
  { name: 'November', value: '11' },
  { name: 'December', value: '12' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const YEARS = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - 18 - i));

interface CheckoutFormProps {
  isExpired: boolean;
  isDisabled: boolean;
  onSubmit: (details: CheckoutDetailsInput) => void;
  onErrorSet: (err: string) => void;
}

export function CheckoutForm({ isExpired, isDisabled, onSubmit, onErrorSet }: CheckoutFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestEmailConfirm, setGuestEmailConfirm] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [keepUpdated, setKeepUpdated] = useState(true);
  const [sendBestEvents, setSendBestEvents] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    
    if (guestEmailConfirm !== guestEmail) errors.guestEmailConfirm = 'Emails do not match';
    if (!guestPhone.trim()) errors.guestPhone = 'Phone number is required';
    if (!birthMonth) errors.birthMonth = 'Month is required';
    if (!birthDay) errors.birthDay = 'Day is required';
    if (!birthYear) errors.birthYear = 'Year is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const birthdateStr = `${birthYear}-${birthMonth}-${birthDay}T00:00:00.000Z`;

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      guestEmailConfirm: guestEmailConfirm.trim().toLowerCase(),
      guestPhone: guestPhone.trim(),
      birthdate: birthdateStr,
      keepUpdated,
      sendBestEvents,
    });
  };

  return (
    <form id="checkout-form" onSubmit={handlePlaceOrderSubmit} className="space-y-4">
      <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
          <h2 className="text-white font-bold text-base">Billing information</h2>
          <span className="text-[10px] text-text-muted uppercase">* Required</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">First name *</label>
            <input
              type="text"
              value={firstName}
              disabled={isDisabled}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className={`w-full px-4 py-2 rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${
                fieldErrors.firstName ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
              }`}
            />
            {fieldErrors.firstName && <p className="text-red-400 text-[10px]">{fieldErrors.firstName}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Last name *</label>
            <input
              type="text"
              value={lastName}
              disabled={isDisabled}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className={`w-full px-4 py-2 rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${
                fieldErrors.lastName ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
              }`}
            />
            {fieldErrors.lastName && <p className="text-red-400 text-[10px]">{fieldErrors.lastName}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Email address *</label>
            <input
              type="email"
              value={guestEmail}
              disabled={isDisabled}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="email@example.com"
              className={`w-full px-4 py-2 rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${
                fieldErrors.guestEmail ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
              }`}
            />
            {fieldErrors.guestEmail && <p className="text-red-400 text-[10px]">{fieldErrors.guestEmail}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Confirm email *</label>
            <input
              type="email"
              value={guestEmailConfirm}
              disabled={isDisabled}
              onChange={(e) => setGuestEmailConfirm(e.target.value)}
              placeholder="Confirm email address"
              className={`w-full px-4 py-2 rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${
                fieldErrors.guestEmailConfirm ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
              }`}
            />
            {fieldErrors.guestEmailConfirm && <p className="text-red-400 text-[10px]">{fieldErrors.guestEmailConfirm}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Cell phone *</label>
            <input
              type="tel"
              value={guestPhone}
              disabled={isDisabled}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className={`w-full px-4 py-2 rounded-xl bg-background border text-base lg:text-sm text-white focus:outline-none transition-colors ${
                fieldErrors.guestPhone ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
              }`}
            />
            {fieldErrors.guestPhone && <p className="text-red-400 text-[10px]">{fieldErrors.guestPhone}</p>}
          </div>

          <div className="space-y-1 flex flex-col justify-between">
            <label className="text-xs text-text-secondary font-medium">Birthdate *</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={birthMonth}
                disabled={isDisabled}
                onChange={(e) => setBirthMonth(e.target.value)}
                className={`px-3 py-2 rounded-xl bg-background border text-base lg:text-xs text-white focus:outline-none ${
                  fieldErrors.birthMonth ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                }`}
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>

              <select
                value={birthDay}
                disabled={isDisabled}
                onChange={(e) => setBirthDay(e.target.value)}
                className={`px-3 py-2 rounded-xl bg-background border text-base lg:text-xs text-white focus:outline-none ${
                  fieldErrors.birthDay ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                }`}
              >
                <option value="">Day</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={birthYear}
                disabled={isDisabled}
                onChange={(e) => setBirthYear(e.target.value)}
                className={`px-3 py-2 rounded-xl bg-background border text-base lg:text-xs text-white focus:outline-none ${
                  fieldErrors.birthYear ? 'border-red-500' : 'border-white/10 focus:border-accent-purple'
                }`}
              >
                <option value="">Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {(fieldErrors.birthMonth || fieldErrors.birthDay || fieldErrors.birthYear) && (
              <p className="text-red-400 text-[10px] mt-1">Valid birthdate is required (Age 18+)</p>
            )}
          </div>
        </div>

        {/* Subscriptions */}
        <div className="space-y-2 pt-3 border-t border-white/5">
          <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-text-secondary leading-normal">
            <input
              type="checkbox"
              checked={keepUpdated}
              disabled={isDisabled}
              onChange={(e) => setKeepUpdated(e.target.checked)}
              className="mt-0.5 rounded border-white/10 bg-background accent-accent-purple"
            />
            <span>Keep me updated on more events and news from this event organizer.</span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-text-secondary leading-normal">
            <input
              type="checkbox"
              checked={sendBestEvents}
              disabled={isDisabled}
              onChange={(e) => setSendBestEvents(e.target.checked)}
              className="mt-0.5 rounded border-white/10 bg-background accent-accent-purple"
            />
            <span>Send me emails about the best events happening nearby or online.</span>
          </label>
        </div>
      </div>
    </form>
  );
}
