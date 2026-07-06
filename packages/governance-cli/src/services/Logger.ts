export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: any): void;
  debug(message: string): void;
}

export class ConsoleLogger implements Logger {
  constructor(private isVerbose: boolean = false) {}

  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`);
    if (error && this.isVerbose) {
      console.error(error);
    }
  }

  debug(message: string): void {
    if (this.isVerbose) {
      console.log(`[DEBUG] ${message}`);
    }
  }
}
