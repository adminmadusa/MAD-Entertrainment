export type TaskEngineEventType =
  | 'TASK_STARTED'
  | 'INTENT_DETECTED'
  | 'CONTEXT_RESOLVED'
  | 'PLAN_CREATED'
  | 'STEP_STARTED'
  | 'STEP_COMPLETED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED';

export interface TaskEngineEvent {
  type: TaskEngineEventType;
  timestamp: number;
  message: string;
  meta?: Record<string, any>;
}

export type TaskEngineListener = (event: TaskEngineEvent) => void;

export class TaskEngineEventEmitter {
  private listeners: TaskEngineListener[] = [];

  subscribe(listener: TaskEngineListener) {
    this.listeners.push(listener);
  }

  emit(type: TaskEngineEventType, message: string, meta?: Record<string, any>) {
    const event: TaskEngineEvent = {
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
