import { RollbackSession } from './rollback_manager';

export interface FixLogger {
  log(msg: string): void;
  warn(msg: string): void;
  error(msg: string, err?: any): void;
}

export interface FixOptions {
  workspaceRoot: string;
  preview?: boolean;
  dryRun?: boolean;
  safeOnly?: boolean;
  rule?: string;
  path?: string;
  interactive?: boolean;
  json?: boolean;
  report?: string;
  logger?: FixLogger;
}

export class FixContext {
  public readonly workspaceRoot: string;
  public readonly preview: boolean;
  public readonly dryRun: boolean;
  public readonly safeOnly: boolean;
  public readonly rule?: string;
  public readonly path?: string;
  public readonly interactive: boolean;
  public readonly json: boolean;
  public readonly report?: string;
  public readonly logger: FixLogger;
  public rollbackSession?: RollbackSession;

  constructor(options: FixOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.preview = !!options.preview;
    this.dryRun = !!options.dryRun;
    this.safeOnly = !!options.safeOnly;
    this.rule = options.rule;
    this.path = options.path;
    this.interactive = !!options.interactive;
    this.json = !!options.json;
    this.report = options.report;
    this.logger = options.logger || {
      log: (msg) => console.log(msg),
      warn: (msg) => console.warn(`⚠️  [Auto-Fix] ${msg}`),
      error: (msg, err) => console.error(`❌  [Auto-Fix] ${msg}`, err || ''),
    };
  }
}
