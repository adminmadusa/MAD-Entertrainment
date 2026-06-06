'use client';

import { useEffect } from 'react';
import { clearChunkRecoveryState } from '@/lib/utils/chunk-recovery';

export function ChunkRecoveryClear() {
  useEffect(() => {
    clearChunkRecoveryState();
  }, []);

  return null;
}
