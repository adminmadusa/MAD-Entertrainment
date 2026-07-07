export interface BaselineResult {
  syncedFiles: string[];
  mismatches: string[];
  status: 'ok' | 'sync_required' | 'error';
}
