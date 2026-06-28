export interface LogEntry {
  timestamp: string;
  phase: string;
  module: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  durationMs?: number;
  meta?: Record<string, any>;
}

export class StructuredLogger {
  private logs: LogEntry[] = [];

  log(level: 'info' | 'warn' | 'error', phase: string, module: string, message: string, durationMs?: number, meta?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      phase,
      module,
      level,
      message,
      durationMs,
      meta
    };
    this.logs.push(entry);
  }

  info(phase: string, module: string, message: string, durationMs?: number, meta?: Record<string, any>) {
    this.log('info', phase, module, message, durationMs, meta);
  }

  warn(phase: string, module: string, message: string, durationMs?: number, meta?: Record<string, any>) {
    this.log('warn', phase, module, message, durationMs, meta);
  }

  error(phase: string, module: string, message: string, durationMs?: number, meta?: Record<string, any>) {
    this.log('error', phase, module, message, durationMs, meta);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}
