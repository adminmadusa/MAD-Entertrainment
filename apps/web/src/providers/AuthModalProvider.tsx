'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { validateReturnTo } from '@/utils/safe-redirect';
import { Modal } from '@mad/ui';

const AuthForm = dynamic(() => import('@/components/auth/AuthForm').then(mod => mod.AuthForm), {
  ssr: false,
});

export interface AuthModalContextType {
  isOpen: boolean;
  isDirty: boolean;
  openAuthModal: (options?: { returnTo?: string }) => void;
  closeAuthModal: () => void;
  setIsDirty: (dirty: boolean) => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}

interface AuthModalProviderProps {
  children: React.ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // Synchronize modal state with URL
  const syncWithUrl = useCallback((open: boolean, redirectUrl?: string | null) => {
    if (typeof window === 'undefined') return;
    const currentParams = new URLSearchParams(window.location.search);
    
    if (open) {
      currentParams.set('auth', 'true');
      if (redirectUrl) {
        const validated = validateReturnTo(redirectUrl);
        if (validated) {
          currentParams.set('returnTo', validated);
        }
      }
    } else {
      currentParams.delete('auth');
      currentParams.delete('returnTo');
    }

    const searchString = currentParams.toString();
    const newUrl = searchString ? `?${searchString}` : window.location.pathname;
    window.history.pushState(null, '', newUrl);
  }, []);

  const openAuthModal = useCallback((options?: { returnTo?: string }) => {
    const validated = options?.returnTo ? validateReturnTo(options.returnTo) : null;
    setReturnTo(validated);
    setIsOpen(true);
    syncWithUrl(true, validated);
  }, [syncWithUrl]);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    setIsDirty(false);
    setReturnTo(null);
    syncWithUrl(false);
  }, [syncWithUrl]);

  const handleCloseRequest = useCallback(() => {
    if (isDirty) {
      setIsConfirmationOpen(true);
    } else {
      closeAuthModal();
    }
  }, [isDirty, closeAuthModal]);

  const handleConfirmDiscard = useCallback(() => {
    setIsConfirmationOpen(false);
    setIsDirty(false);
    closeAuthModal();
  }, [closeAuthModal]);

  const handleCancelDiscard = useCallback(() => {
    setIsConfirmationOpen(false);
  }, []);

  const isOpenRef = useRef(isOpen);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Listen for Next.js/Browser history navigation (back/forward buttons)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const hasAuth = params.get('auth') === 'true';
      const currentIsOpen = isOpenRef.current;
      const currentIsDirty = isDirtyRef.current;

      if (!hasAuth && currentIsOpen) {
        if (currentIsDirty) {
          // Put auth=true back to prevent navigation away, and trigger confirmation
          const currentParams = new URLSearchParams(window.location.search);
          currentParams.set('auth', 'true');
          window.history.pushState(null, '', `?${currentParams.toString()}`);
          setIsConfirmationOpen(true);
        } else {
          setIsOpen(false);
          setIsDirty(false);
          setReturnTo(null);
        }
      } else if (hasAuth && !currentIsOpen) {
        setIsOpen(true);
        setReturnTo(validateReturnTo(params.get('returnTo')));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Read initial URL state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'true') {
      setIsOpen(true);
      setReturnTo(validateReturnTo(params.get('returnTo')));
    }
  }, []);

  const handleSuccess = useCallback(() => {
    closeAuthModal();
    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push('/dashboard');
    }
  }, [closeAuthModal, returnTo, router]);

  const modalValue = useMemo(() => ({
    isOpen,
    isDirty,
    openAuthModal,
    closeAuthModal,
    setIsDirty,
  }), [isOpen, isDirty, openAuthModal, closeAuthModal, setIsDirty]);

  return (
    <AuthModalContext.Provider value={modalValue}>
      {children}

      {/* Main Authentication Modal / Bottom Sheet */}
      <Modal
        isOpen={isOpen}
        onClose={handleCloseRequest}
        showCloseButton={false}
        closeOnBackdropClick={!isDirty} // Disable backdrop close if dirty
        enableSwipeToClose={!isDirty} // Disable swipe close if dirty
        ariaLabelledBy="auth-modal-title"
        ariaDescribedBy="auth-modal-description"
      >
        <div className="pt-2">
          <AuthForm
            mode="login"
            onSuccess={handleSuccess}
            onClose={handleCloseRequest}
            onDirtyChange={setIsDirty}
          />
        </div>
      </Modal>

      {/* Discard Changes Accessible Confirmation Dialog */}
      <Modal
        isOpen={isConfirmationOpen}
        onClose={handleCancelDiscard}
        showCloseButton={false}
        closeOnBackdropClick={false}
        enableSwipeToClose={false}
        ariaLabelledBy="confirm-title"
        ariaDescribedBy="confirm-desc"
      >
        <div className="space-y-6 text-center">
          <h3 id="confirm-title" className="text-xl font-bold text-white tracking-tight">
            Discard Changes?
          </h3>
          <p id="confirm-desc" className="text-text-secondary text-sm leading-relaxed">
            You have unsaved sign-in progress. Are you sure you want to discard your changes and close?
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirmDiscard}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleCancelDiscard}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Keep Editing
            </button>
          </div>
        </div>
      </Modal>
    </AuthModalContext.Provider>
  );
}
