const STORAGE_KEY = 'chunk-recovery-timestamp';

export function getChunkRecoveryTimestamp(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setChunkRecoveryTimestamp(timestamp: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, timestamp);
  } catch {
    // Ignore storage blocker errors (e.g. Safari private mode restrictions)
  }
}

export function clearChunkRecoveryState(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function isChunkLoadFailure(error: Error & { digest?: string }): boolean {
  if (!error) return false;
  const name = error.name || '';
  const message = error.message || '';
  const stack = error.stack || '';

  // Basic indicators for dynamic module or chunk loading failures
  const isBasicChunkError =
    name === 'ChunkLoadError' ||
    message.includes('ChunkLoadError') ||
    /loading chunk/i.test(message) ||
    /failed to fetch dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /mime type/i.test(message);

  // Check if it is a SyntaxError containing '<', which is a signature of dynamic fallback HTML
  const isSyntaxHtmlError =
    /unexpected token '<'/i.test(message) ||
    (error instanceof SyntaxError && message.includes('<'));

  if (isSyntaxHtmlError) {
    // Confirm it is a chunk/build mismatch by checking for chunk references in stack or message.
    // This helps avoid false positives from unrelated API parsing/Syntax errors.
    const hasChunkSignals =
      isBasicChunkError ||
      /static\/chunks/i.test(stack) ||
      /_next\/static/i.test(stack) ||
      /static\/chunks/i.test(message) ||
      /_next\/static/i.test(message);

    return hasChunkSignals;
  }

  return isBasicChunkError;
}

export function isBuildMismatchChunkFailure(error: Error & { digest?: string }): boolean {
  if (!isChunkLoadFailure(error)) return false;

  const message = error.message || '';

  // HTML fallback responses (which occur when the server returns layout/HTML for missing chunks)
  // are the primary indicator of a build deployment mismatch.
  const isHtmlFallback =
    /unexpected token '<'/i.test(message) ||
    /mime type/i.test(message) ||
    (error instanceof SyntaxError && message.includes('<'));

  return isHtmlFallback;
}
