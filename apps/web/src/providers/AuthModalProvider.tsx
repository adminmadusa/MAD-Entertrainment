'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { validateReturnTo } from '@/utils/safe-redirect';
import { Modal } from '@mad/ui';

const AuthForm = dynamic(() => import('@/components/auth/AuthForm').then(mod => mod.AuthForm), {
  ssr: false,
});

export interface OpenAuthModalOptions {
  returnTo?: string;
  initialEmail?: string;
  readonlyEmail?: boolean;
  autoRequestOtp?: boolean;
}

export interface AuthModalContextType {
  isOpen: boolean;
  isDirty: boolean;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
  setIsDirty: (dirty: boolean) => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    return {
      isOpen: false,
      isDirty: false,
      openAuthModal: () => {},
      closeAuthModal: () => {},
      setIsDirty: () => {},
    };
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
  const [modalConfig, setModalConfig] = useState<OpenAuthModalOptions | null>(null);

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

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    const validated = options?.returnTo ? validateReturnTo(options.returnTo) : null;
    setReturnTo(validated);
    setModalConfig(options || null);
    setIsOpen(true);
    syncWithUrl(true, validated);
  }, [syncWithUrl]);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    setIsDirty(false);
    setReturnTo(null);
    setModalConfig(null);
    syncWithUrl(false);
  }, [syncWithUrl]);

  const handleCloseRequest = useCallback(() => {
    closeAuthModal();
  }, [closeAuthModal]);

  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);


  // Listen for Next.js/Browser history navigation (back/forward buttons)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const hasAuth = params.get('auth') === 'true';
      const currentIsOpen = isOpenRef.current;

      if (!hasAuth && currentIsOpen) {
        setIsOpen(false);
        setIsDirty(false);
        setReturnTo(null);
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
        size="sm"
        showCloseButton={true}
        presentation="bottom-sheet"
        closeOnBackdropClick={true}
        enableSwipeToClose={true}
        ariaLabelledBy="auth-modal-title"
        ariaDescribedBy="auth-modal-description"
        className="sm:max-w-[400px]"
      >
        <div className="pt-2 sm:pt-1">
          <AuthForm
            mode="login"
            onSuccess={handleSuccess}
            onClose={handleCloseRequest}
            onDirtyChange={setIsDirty}
            initialEmail={modalConfig?.initialEmail}
            readonlyEmail={modalConfig?.readonlyEmail}
            autoRequestOtp={modalConfig?.autoRequestOtp}
          />
        </div>
      </Modal>
    </AuthModalContext.Provider>
  );
}
