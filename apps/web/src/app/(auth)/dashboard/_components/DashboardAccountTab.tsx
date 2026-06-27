'use client';

import dynamic from 'next/dynamic';

const ProfileEditor = dynamic(() => import('@/components/account/ProfileEditor').then(mod => mod.ProfileEditor), {
  ssr: false,
});

export function DashboardAccountTab() {
  return (
    <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 blur-[100px] pointer-events-none" />
      <ProfileEditor />
    </div>
  );
}
