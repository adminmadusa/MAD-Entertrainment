import { EngineContext } from '../../types';

export interface ScanContext {
  context: EngineContext;
  scannedFiles: string[];
}
