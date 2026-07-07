import { Patch } from './patch';

export interface AutoFixResult {
  success: boolean;
  patch: Patch | null;
  modifiedContent: string;
  error?: string;
}

export interface RollbackResult {
  success: boolean;
  originalContent: string;
  error?: string;
}
