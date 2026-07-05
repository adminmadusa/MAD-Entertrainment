'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

import { AdminRole } from '@mad/shared';
import type { Admin } from '@mad/types';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

interface ChangeRoleModalProps {
  target: Admin;
  onClose: () => void;
  onSubmit: (id: string, role: AdminRole) => void;
  isPending: boolean;
  serverError: string;
}

export default function ChangeRoleModal({
  target,
  onClose,
  onSubmit,
  isPending,
  serverError,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<AdminRole>(
    (target.role as AdminRole) ?? AdminRole.ADMIN
  );
  const [localError, setLocalError] = useState('');

  const error = localError || serverError;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
      >
        <div>
          <h3 className="text-white font-bold text-lg">Change Admin Role</h3>
          <p className="text-text-muted text-xs">
            Update dashboard permissions for{' '}
            <strong className="text-white">{target.name}</strong>
          </p>
        </div>

        {error && (
          <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-400">
          Changing this role will immediately affect permissions.
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLocalError('');
            onSubmit(target._id, selectedRole);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Dashboard Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
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
              disabled={isPending || selectedRole === target.role}
              className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
            >
              {isPending ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
