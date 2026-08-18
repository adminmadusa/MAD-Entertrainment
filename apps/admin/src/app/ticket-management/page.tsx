'use client';

import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';

import { EventCategoriesTab } from './_components/EventCategoriesTab';
import { TicketProfilesTab } from './_components/TicketProfilesTab';
import { TicketTiersTab } from './_components/TicketTiersTab';

type TabType = 'profiles' | 'tiers' | 'categories';

function TicketManagementContent() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialTab: TabType =
    tabParam === 'categories' || tabParam === 'tiers' || tabParam === 'profiles'
      ? tabParam
      : 'profiles';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam === 'categories' || tabParam === 'tiers' || tabParam === 'profiles') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/ticket-management?${params.toString()}`, { scroll: false });
  };

  // Authorization Checkers
  const canMutate =
    !!admin?.role &&
    [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(
      admin.role as AdminRole
    );

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
        <p className="text-text-muted text-sm mt-0.5">
          Configure reusable ticket structures, visual pricing tiers, and event categories
        </p>
      </div>

      {/* Tab Navigation Menu */}
      <div
        className="flex flex-wrap border-b border-border-subtle"
        role="tablist"
        aria-label="Ticket Management Subtabs"
      >
        <button
          onClick={() => handleTabChange('profiles')}
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
          onClick={() => handleTabChange('tiers')}
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
        <button
          onClick={() => handleTabChange('categories')}
          role="tab"
          aria-selected={activeTab === 'categories'}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'categories'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Event Categories
        </button>
      </div>

      {activeTab === 'profiles' && (
        <TicketProfilesTab canMutate={canMutate} qc={qc} showToast={showToast} />
      )}
      {activeTab === 'tiers' && (
        <TicketTiersTab canMutate={canMutate} qc={qc} showToast={showToast} />
      )}
      {activeTab === 'categories' && (
        <EventCategoriesTab canMutate={canMutate} qc={qc} showToast={showToast} />
      )}
    </div>
  );
}

export default function TicketManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-white/5 rounded-lg w-64" />
          <div className="h-4 bg-white/5 rounded w-96" />
          <div className="h-10 bg-white/5 rounded-lg w-full" />
        </div>
      }
    >
      <TicketManagementContent />
    </Suspense>
  );
}
