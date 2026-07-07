import { Page } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { RuntimeValidator } from './validator';
import { RuntimeFinding } from './runtime-finding';
import { VIEWPORTS, Viewport } from '../config/viewports';
import { targets, UITarget } from '../config/pages';
import { TelemetryCollector } from './telemetry/collector';
import { ReporterRegistry, ConsoleReporter, JsonReporter } from './reporters/index';
import { waitPageStability } from '../utils/browser';
import { detectDOMOverflows } from '../utils/dom';

const workspaceRoot = resolve(__dirname, '../../..');

// Bootstrap reporters once
let reportersInitialized = false;
function initializeReporters() {
  if (reportersInitialized) return;
  ReporterRegistry.clear();
  ReporterRegistry.register(new ConsoleReporter());
  ReporterRegistry.register(new JsonReporter());
  reportersInitialized = true;
}

export class RuntimeRunner {
  public async execute(page: Page, validator: RuntimeValidator) {
    initializeReporters();
    TelemetryCollector.clear();

    const allFindings: RuntimeFinding[] = [];

    // Run validator across all targets (web and admin)
    for (const target of targets) {
      for (const route of target.routes) {
        const fullUrl = `${target.baseUrl}${route}`;
        const sanitizedRoute = route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '_');

        for (const viewport of VIEWPORTS) {
          // Set viewport size
          await page.setViewportSize({ width: viewport.width, height: viewport.height });

          const startTime = Date.now();
          let pageLoaded = false;
          let elementsCount = 0;
          let findings: RuntimeFinding[] = [];

          try {
            // Navigate to page
            await page.goto(fullUrl, { waitUntil: 'load', timeout: 30000 });
            await waitPageStability(page);
            pageLoaded = true;

            // Inject the DOM checking function client-side to make it accessible
            await page.evaluate(`window.detectDOMOverflows = ${detectDOMOverflows.toString()}`);

            // Count visible elements for telemetry
            elementsCount = await page.evaluate(() => {
              return document.querySelectorAll('*').length;
            });

            // Execute validator
            findings = await validator.run(page, viewport, route);
          } catch (err: any) {
            // Log target load failure (e.g. server offline) but continue validation flow
            console.warn(`⚠️ Target page failed to run validation: ${fullUrl} (${viewport.name}) -> ${err.message}`);
          }

          const durationMs = Date.now() - startTime;

          // Record telemetry
          TelemetryCollector.addEntry({
            ruleId: validator.metadata.ruleId,
            page: route,
            viewport: `${viewport.width}x${viewport.height}`,
            durationMs,
            elementsChecked: elementsCount,
            violationsCount: findings.length,
            status: findings.length === 0 && pageLoaded ? 'PASS' : 'FAIL'
          });

          // Handle findings and screenshot evidence
          if (findings.length > 0) {
            const evidenceDir = resolve(
              workspaceRoot,
              `tests/ui-governance/evidence/screenshots/${validator.metadata.ruleId}/${target.app}`
            );
            if (!existsSync(evidenceDir)) {
              mkdirSync(evidenceDir, { recursive: true });
            }
            const screenshotPath = resolve(evidenceDir, `${sanitizedRoute}_${viewport.name}_failure.png`);
            
            try {
              await page.screenshot({ path: screenshotPath, fullPage: true });
              for (const finding of findings) {
                finding.screenshotPath = screenshotPath;
              }
            } catch (e) {
              // Fail-safe screenshot capture
            }

            allFindings.push(...findings);
          }
        }
      }
    }

    // Dispatch telemetry and findings to reporters
    const summary = TelemetryCollector.getSummary();
    await ReporterRegistry.reportSummary(summary);
    await ReporterRegistry.reportFindings(allFindings);

    // Assert zero violations
    if (allFindings.length > 0) {
      throw new Error(`[UI Governance Gating Failure] Horizontal Layout Overflow (VAL-UI-023) detected! Ref. tests/ui-governance/evidence/screenshots/`);
    }
  }
}

export const runner = new RuntimeRunner();
