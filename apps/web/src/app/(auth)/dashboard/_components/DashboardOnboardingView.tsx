'use client';

import React from 'react';

import { ProfileCompletionForm } from '@/components/auth/ProfileCompletionForm';
import type { AuthUser } from '@/types/auth';

interface DashboardOnboardingViewProps {
  user: AuthUser | null;
  onCancel: () => void;
}

export function DashboardOnboardingView({
  user,
  onCancel,
}: DashboardOnboardingViewProps) {
  return (
    <div className="pt-28 sm:pt-32 pb-16 min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-md relative z-10 w-full px-4 mt-6 sm:mt-8">
        <div className="glass-strong rounded-3xl border border-border-subtle p-5 sm:p-8 shadow-2xl transition-all duration-500 hover:border-white/10">
          <ProfileCompletionForm
            initialFirstName={user?.firstName || ''}
            initialLastName={user?.lastName || ''}
            initialMobileNumber={user?.mobileNumber || ''}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}
