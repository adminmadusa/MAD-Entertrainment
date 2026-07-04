import { useCallback, useEffect, useRef, useState } from 'react';

import { loadScriptOnce } from '@/lib/utils/load-script-once';
import { GoogleCredentialResponse, initializeGoogleIdentity, registerGoogleIdentityCallback } from '@/utils/google-identity';


interface GoogleIdentity {
  accounts: {
    id: {
      renderButton(
        parent: HTMLElement | null,
        options: {
          theme?: string;
          size?: string;
          width?: string;
          shape?: string;
          text?: string;
        }
      ): void;
    };
  };
}

export function useGoogleSignIn(options?: {
  onSuccess?: (credential: string) => void;
  onError?: (err: string) => void;
}) {
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // 1. Script loading on mount
  useEffect(() => {
    let active = true;
    const loadGsi = async () => {
      try {
        await loadScriptOnce('https://accounts.google.com/gsi/client');
        if (active) setGsiLoaded(true);
      } catch (err) {
        console.error('Failed to load GSI script:', err);
        if (active) setLoadingError('Failed to load Google Sign-In');
      }
    };
    loadGsi();
    return () => {
      active = false;
    };
  }, []);

  // 2. Lifecycle-bound callback registration using mutable ref to prevent re-registration
  const successRef = useRef(options?.onSuccess);
  useEffect(() => {
    successRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  const errorRef = useRef(options?.onError);
  useEffect(() => {
    errorRef.current = options?.onError;
  }, [options?.onError]);

  useEffect(() => {
    const unsubscribe = registerGoogleIdentityCallback((response: GoogleCredentialResponse) => {
      if (response?.credential) {
        successRef.current?.(response.credential);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 3. Render function is free of callback side-effects
  const renderButton = useCallback((
    element: HTMLElement,
    buttonOptions?: { theme?: string; size?: string; width?: string; shape?: string; text?: string }
  ) => {
    const googleObj = (window as unknown as { google?: GoogleIdentity }).google;
    if (!googleObj) return;

    try {
      initializeGoogleIdentity(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'google_client_id_placeholder'
      );

      googleObj.accounts.id.renderButton(element, {
        theme: buttonOptions?.theme || 'filled_dark',
        size: buttonOptions?.size || 'large',
        width: buttonOptions?.width || '100%',
        shape: buttonOptions?.shape || 'pill',
        text: buttonOptions?.text || 'signin_with',
      });
    } catch (err) {
      console.error('Failed to render GSI button:', err);
      errorRef.current?.('Failed to render Google button');
    }
  }, []);

  return { gsiLoaded, loadingError, renderButton };
}
export type UseGoogleSignInReturn = ReturnType<typeof useGoogleSignIn>;
