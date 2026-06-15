'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

export default function BookingDetailPageRedirect() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const reference = (params?.reference as string) || '';

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace(
        reference
          ? `/dashboard?tab=tickets&ref=${encodeURIComponent(reference.trim())}`
          : '/dashboard?tab=tickets'
      );
    } else {
      router.replace(
        reference
          ? `/tickets?ref=${encodeURIComponent(reference.trim())}`
          : '/tickets'
      );
    }
  }, [isAuthenticated, isLoading, reference, router]);

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
      <div className="text-purple-300 animate-pulse text-sm">
        Redirecting...
      </div>
    </div>
  );
}
