export interface GoogleCredentialResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }): void;
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
}

export interface GoogleIdentity {
  accounts: {
    id: GoogleAccountsId;
  };
}

let googleIdentityInitialized = false;
const callbacks = new Set<(response: GoogleCredentialResponse) => void>();
let legacyCleanup: (() => void) | null = null;

/**
 * Initializes the Google Identity Services SDK exactly once per browser session.
 * Subsequent calls are safe and will be ignored.
 * Uses a subscriber pattern to execute all registered component callbacks.
 */
export function initializeGoogleIdentity(clientId: string): void {
  if (typeof window === 'undefined') return;

  const googleObj = (window as unknown as { google?: GoogleIdentity }).google;
  if (!googleObj) return;

  if (!googleIdentityInitialized) {
    try {
      googleObj.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => {
          callbacks.forEach((cb) => cb(response));
        },
        auto_select: false,
      });
      googleIdentityInitialized = true;
    } catch (err) {
      console.error('Failed to initialize Google SDK Identity client:', err);
    }
  }
}

/**
 * Registers a callback handler for a mounted auth component.
 * Returns an unregister cleanup function.
 */
export function registerGoogleIdentityCallback(
  callback: (response: GoogleCredentialResponse) => void
): () => void {
  callbacks.add(callback);
  return () => {
    callbacks.delete(callback);
  };
}

/**
 * Sets the callback handler for the currently active/mounted auth component.
 * Pass null to clean up when the component unmounts.
 * Retained for backward-compatibility.
 */
export function setGoogleIdentityCallback(
  callback: ((response: GoogleCredentialResponse) => void) | null
): void {
  if (legacyCleanup) {
    legacyCleanup();
    legacyCleanup = null;
  }
  if (callback) {
    legacyCleanup = registerGoogleIdentityCallback(callback);
  }
}

