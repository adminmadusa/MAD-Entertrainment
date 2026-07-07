export type OrchestratorEventType =
  | 'BOOT'
  | 'DISCOVERY'
  | 'PIPELINE_CREATED'
  | 'VALIDATION_STARTED'
  | 'VALIDATION_COMPLETED'
  | 'AUTOFIX_STARTED'
  | 'AUTOFIX_COMPLETED'
  | 'REPORT_GENERATED'
  | 'ERROR'
  | 'RECOVERY'
  | 'COMPLETED';

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  timestamp: number;
  message: string;
  meta?: Record<string, any>;
}

export type OrchestratorListener = (event: OrchestratorEvent) => void;

export class OrchestratorEventEmitter {
  private listeners: OrchestratorListener[] = [];

  subscribe(listener: OrchestratorListener) {
    this.listeners.push(listener);
  }

  emit(type: OrchestratorEventType, message: string, meta?: Record<string, any>) {
    const event: OrchestratorEvent = {
      type,
      timestamp: Date.now(),
      message,
      meta
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
