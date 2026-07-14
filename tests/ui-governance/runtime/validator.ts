import { Page } from '@playwright/test';
import { RuntimeFinding } from './runtime-finding';
import { Viewport } from '../config/viewports';

export interface RuntimeValidatorMetadata {
  ruleId: string;
  category: 'accessibility' | 'responsive' | 'visual' | 'interaction';
  tags: string[];
  requiresDOM: boolean;
  supportsScreenshots: boolean;
}

export interface RuntimeValidator {
  readonly metadata: RuntimeValidatorMetadata;
  run(page: Page, viewport: Viewport, url: string): Promise<RuntimeFinding[]>;
}
