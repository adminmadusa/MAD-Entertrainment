'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { useAuthModal } from '@/providers/AuthModalProvider';
import { useAuth } from '@/providers/AuthProvider';
import { validateReturnTo } from '@/utils/safe-redirect';

/**
 * LEGACY COMPATIBILITY REDIRECT
 * The /login route is no longer the primary authentication flow.
 * Authentication is now handled exclusively through the auth modal.
 * This page redirects to / and opens the auth modal automatically,
 * preserving bookmarks and external links that still reference /login.
 */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { openAuthModal } = useAuthModal();

  const rawReturnTo = searchParams.get('returnTo');
  const returnTo = validateReturnTo(rawReturnTo);

  useEffect(() => {
    if (isAuthLoading) return;

    if (isAuthenticated) {
      // Already signed in — send to destination or dashboard
      router.replace(returnTo || '/dashboard');
    } else {
      // Open auth modal on home page instead of showing legacy /login UI
      router.replace(returnTo ? `/?returnTo=${encodeURIComponent(returnTo)}` : '/');
      openAuthModal({ returnTo: returnTo ?? undefined });
    }
  }, [isAuthenticated, isAuthLoading, router, returnTo, openAuthModal]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-purple-300 text-sm animate-pulse">Redirecting...</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-purple-300 text-sm animate-pulse">Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
