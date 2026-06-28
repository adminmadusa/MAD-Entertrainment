import { RuntimeEngineError } from '../errors';

export class TaskEngineError extends RuntimeEngineError {
  constructor(message: string, phase = 'Executing') {
    super(message, phase);
    this.name = 'TaskEngineError';
  }
}

export class IntentDetectionError extends TaskEngineError {
  constructor(message: string) {
    super(message, 'Intent Detection');
    this.name = 'IntentDetectionError';
  }
}

export class ContextResolutionError extends TaskEngineError {
  constructor(message: string) {
    super(message, 'Context Resolution');
    this.name = 'ContextResolutionError';
  }
}
