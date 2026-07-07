import { Page } from '@playwright/test';
import { RuntimeFinding } from './runtime-finding';
import { Viewport } from '../config/viewports';

export interface RuntimeValidator {
  readonly ruleId: string;
  readonly tags: string[];
  run(page: Page, viewport: Viewport, url: string): Promise<RuntimeFinding[]>;
}
