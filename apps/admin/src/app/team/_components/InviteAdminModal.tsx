'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { AdminRole } from '@mad/shared';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

interface InviteAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; email: string; password: string; role: AdminRole }) => void;
  isPending: boolean;
  serverError: string;
}

export default function InviteAdminModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  serverError,
}: InviteAdminModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>(AdminRole.ADMIN);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setRole(AdminRole.ADMIN);
      setLocalError('');
    }
  }, [isOpen]);

  const error = localError || serverError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!name.trim() || !email.trim() || !password) {
      setLocalError('All fields are required.');
      return;
    }
    onSubmit({ name: name.trim(), email: email.trim(), password, role });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
      >
        <div>
          <h3 className="text-white font-bold text-lg">Invite Admin User</h3>
          <p className="text-text-muted text-xs">Assign access credentials and roles</p>
        </div>

        {error && (
          <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@madentertrainment.com"
              required
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Access Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters, complex"
              required
              className={inputCls}
            />
            <p className="text-[10px] text-text-muted leading-relaxed">
              Must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special character.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Dashboard Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className={inputCls}
            >
              <option value={AdminRole.SUPER_ADMIN} className="bg-background-card">Super Admin</option>
              <option value={AdminRole.ADMIN} className="bg-background-card">Admin</option>
              <option value={AdminRole.MANAGER} className="bg-background-card">Manager</option>
              <option value={AdminRole.SUPPORT} className="bg-background-card">Support</option>
              <option value={AdminRole.SCANNER} className="bg-background-card">Scanner</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
            >
              {isPending ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
