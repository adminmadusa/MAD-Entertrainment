'use client';

import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import { TicketProfilesTab } from './_components/TicketProfilesTab';
import { TicketTiersTab } from './_components/TicketTiersTab';

export default function TicketManagementPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profiles' | 'tiers'>('profiles');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authorization Checkers
  const canMutate = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 bg-accent-purple text-white font-semibold text-sm rounded-xl shadow-glow"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Ticket Management</h1>
        <p className="text-text-muted text-sm mt-0.5">Configure reusable ticket structures and visual pricing tiers</p>
      </div>

      {/* Tab Navigation Menu */}
      <div className="flex flex-wrap border-b border-border-subtle" role="tablist" aria-label="Ticket Management Subtabs">
        <button
          onClick={() => setActiveTab('profiles')}
          role="tab"
          aria-selected={activeTab === 'profiles'}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'profiles'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Ticket Profiles
        </button>
        <button
          onClick={() => setActiveTab('tiers')}
          role="tab"
          aria-selected={activeTab === 'tiers'}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'tiers'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Ticket Tiers
        </button>
      </div>

      {activeTab === 'profiles' ? (
        <TicketProfilesTab canMutate={canMutate} qc={qc} showToast={showToast} />
      ) : (
        <TicketTiersTab canMutate={canMutate} qc={qc} showToast={showToast} />
      )}
    </div>
  );
}
