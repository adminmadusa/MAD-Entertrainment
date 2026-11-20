import { ExitCode } from '../config/schema';

export interface OutputModel<T = unknown> {
  type: string;
  success: boolean;
  exitCode: ExitCode;
  data?: T;
}
