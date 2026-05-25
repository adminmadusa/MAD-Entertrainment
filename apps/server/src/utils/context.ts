import { AsyncLocalStorage } from 'async_hooks';

export interface TraceContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  socketId?: string;
  action?: string;
  [key: string]: any;
}

export const traceStorage = new AsyncLocalStorage<TraceContext>();

export function getCorrelationId(): string | undefined {
  return traceStorage.getStore()?.correlationId;
}

export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

export function runWithContext<T>(context: TraceContext, fn: () => T | Promise<T>): T | Promise<T> {
  return traceStorage.run(context, fn);
}
