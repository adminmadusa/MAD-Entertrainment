import { Page } from '@playwright/test';
import { RuntimeValidator } from '../runtime/validator';
import { RuntimeFinding } from '../runtime-finding';
import { Viewport } from '../config/viewports';
import { RuleLoader } from '../runtime/rule-loader';
import { RuntimeRegistry } from '../runtime/registry';
import { detectDOMOverflows, DOMOverflowItem } from '../utils/dom';

export class HorizontalOverflowValidator implements RuntimeValidator {
  readonly metadata = {
    ruleId: 'VAL-UI-023',
    category: 'responsive' as const,
    tags: ['responsive', 'playwright'],
    requiresDOM: true,
    supportsScreenshots: true
  };

  public async run(page: Page, viewport: Viewport, url: string): Promise<RuntimeFinding[]> {
    const findings: RuntimeFinding[] = [];
    const ruleMeta = RuleLoader.getRuleMetadata(this.metadata.ruleId);

    // 1. Check document.documentElement.scrollWidth
    const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    
    // 2. Check document.body.scrollWidth
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);

    const hasGlobalOverflow = docScrollWidth > viewport.width || bodyScrollWidth > viewport.width;

    if (hasGlobalOverflow) {
      findings.push({
        ruleId: this.metadata.ruleId,
        severity: ruleMeta.severity,
        page: url,
        viewport: `${viewport.width}x${viewport.height}`,
        message: `Global page scroll width (${Math.max(docScrollWidth, bodyScrollWidth)}px) exceeds viewport width (${viewport.width}px).`
      });
    }

    // 3. Scan individual elements for bounding boxes extending past viewport width
    const overflowingElements = await page.evaluate(
      (width) => {
        // Evaluate the DOM detection function injected client-side
        return (window as any).detectDOMOverflows(width);
      },
      viewport.width
    ) as DOMOverflowItem[];

    for (const item of overflowingElements) {
      findings.push({
        ruleId: this.metadata.ruleId,
        severity: ruleMeta.severity,
        page: url,
        viewport: `${viewport.width}x${viewport.height}`,
        selector: item.selector,
        message: `Element overflows viewport horizontally. Element bounds: left=${item.rect.left}px, right=${item.rect.right}px, width=${item.rect.width}px. Viewport width: ${viewport.width}px.`
      });
    }

    return findings;
  }
}

// Self-registration
RuntimeRegistry.register(new HorizontalOverflowValidator());
