'use client';

import { useState } from 'react';

import type { Admin } from '@mad/types';
import { Modal, Button } from '@mad/ui';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

interface ResetPasswordModalProps {
  target: Admin;
  onClose: () => void;
  onSubmit: (id: string, payload: { password: string }) => void;
  isPending: boolean;
  serverError: string;
}

export default function ResetPasswordModal({
  target,
  onClose,
  onSubmit,
  isPending,
  serverError,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const error = localError || serverError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!newPassword || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    onSubmit(target._id, { password: newPassword });
  };

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="reset-password-title"
      className="glass-strong border border-border-subtle p-6 max-w-md space-y-4"
    >
      <div>
        <h3 id="reset-password-title" className="text-white font-bold text-lg">Reset Password</h3>
          <p className="text-text-muted text-xs">
            Assign a new complex access password for{' '}
            <strong className="text-white">{target.name}</strong>
          </p>
        </div>

        {error && (
          <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
          Resetting the password will immediately invalidate all active sessions for this administrator.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters, complex"
                required
                className={inputCls}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-1.5 text-text-muted hover:text-white text-xs font-semibold h-7 px-2"
              >
                {showPassword ? 'Hide' : 'Show'}
              </Button>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special character.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              className={inputCls}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              isLoading={isPending}
              className="flex-1"
            >
              Confirm Reset
            </Button>
          </div>
        </form>
    </Modal>
  );
}
