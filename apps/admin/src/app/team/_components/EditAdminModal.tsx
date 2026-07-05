'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

import type { Admin } from '@mad/types';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

interface EditAdminModalProps {
  target: Admin;
  meProfileId: string | undefined;
  onClose: () => void;
  onSubmit: (id: string, payload: { name: string; email: string }) => void;
  isPending: boolean;
  serverError: string;
}

export default function EditAdminModal({
  target,
  meProfileId,
  onClose,
  onSubmit,
  isPending,
  serverError,
}: EditAdminModalProps) {
  const [editName, setEditName] = useState(target.name ?? '');
  const [editEmail, setEditEmail] = useState(target.email ?? '');
  const [localError, setLocalError] = useState('');

  const isSelf = meProfileId !== undefined && meProfileId === target._id;
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
          <h3 className="text-white font-bold text-lg">Edit Admin Details</h3>
          <p className="text-text-muted text-xs">Update administrator profile information</p>
        </div>

        {error && (
          <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLocalError('');
            if (!editName.trim() || !editEmail.trim()) {
              setLocalError('All fields are required.');
              return;
            }
            onSubmit(target._id, { name: editName.trim(), email: editEmail.trim() });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Full Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Email Address</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
              disabled={isSelf}
              title={isSelf ? 'You cannot edit your own email address' : undefined}
              className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {isSelf && (
              <p className="text-[10px] text-yellow-400">
                Self-email modification is disabled to prevent session mismatch.
              </p>
            )}
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
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
