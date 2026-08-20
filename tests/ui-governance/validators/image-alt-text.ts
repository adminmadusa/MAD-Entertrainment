import { Page } from '@playwright/test';
import { RuntimeValidator } from '../runtime/validator';
import { RuntimeFinding } from '../runtime-finding';
import type { Viewport } from '../config/viewports';
import { RuleLoader } from '../runtime/rule-loader';
import { RuntimeRegistry } from '../runtime/registry';
import { type AccessibilityViolationItem } from '../utils/dom';

export class ImageAltTextValidator implements RuntimeValidator {
  readonly metadata = {
    ruleId: 'VAL-UI-020',
    category: 'accessibility' as const,
    tags: ['accessibility', 'playwright'],
    requiresDOM: true,
    supportsScreenshots: true
  };

  public async run(page: Page, viewport: Viewport, url: string): Promise<RuntimeFinding[]> {
    const findings: RuntimeFinding[] = [];
    const ruleMeta = RuleLoader.getRuleMetadata(this.metadata.ruleId);

    // Inject the DOM check functions client-side
    await page.evaluate(`
      if (!window.AccessibilityDOM) {
        window.getUniqueSelector = function(el) {
          if (el.id) return '#' + el.id;
          let path = el.tagName.toLowerCase();
          let parent = el.parentElement;
          while (parent) {
            const index = Array.from(parent.children).indexOf(el) + 1;
            path = parent.tagName.toLowerCase() + ' > ' + path + ':nth-child(' + index + ')';
            el = parent;
            parent = parent.parentElement;
          }
          return path;
        };

        window.AccessibilityDOM = {
          detectImageAltViolations: function() {
            const violations = [];
            const images = document.querySelectorAll('img');
            const isHiddenOrDecorative = function(el) {
              let curr = el;
              while (curr) {
                const style = window.getComputedStyle(curr);
                if (
                  style.display === 'none' ||
                  style.visibility === 'hidden' ||
                  style.opacity === '0' ||
                  curr.hasAttribute('hidden')
                ) {
                  return true;
                }
                const role = curr.getAttribute('role');
                const ariaHidden = curr.getAttribute('aria-hidden');
                if (
                  role === 'presentation' ||
                  role === 'none' ||
                  ariaHidden === 'true'
                ) {
                  return true;
                }
                curr = curr.parentElement;
              }
              return false;
            };

            for (let i = 0; i < images.length; i++) {
              const img = images[i];
              if (isHiddenOrDecorative(img)) {
                continue;
              }
              const alt = img.getAttribute('alt');
              if (alt === null) {
                violations.push({
                  selector: window.getUniqueSelector(img),
                  outerHTML: img.outerHTML.substring(0, 150),
                  message: 'Image element is missing the alt attribute.'
                });
                continue;
              }
              if (alt.trim() === '') {
                violations.push({
                  selector: window.getUniqueSelector(img),
                  outerHTML: img.outerHTML.substring(0, 150),
                  message: 'Image element has empty alt attribute but is not marked as decorative (requires role="presentation", role="none", or aria-hidden="true").'
                });
              }
            }
            return violations;
          }
        };
      }
    `);

    // Execute violations detection client-side
    const violations = await page.evaluate(() => {
      return (window as any).AccessibilityDOM.detectImageAltViolations();
    }) as AccessibilityViolationItem[];

    for (const item of violations) {
      findings.push({
        ruleId: this.metadata.ruleId,
        severity: ruleMeta.severity,
        page: url,
        viewport: `${viewport.width}x${viewport.height}`,
        selector: item.selector,
        message: `${item.message} DOM snippet: ${item.outerHTML}`
      });
    }

    return findings;
  }
}

// Self-registration
RuntimeRegistry.register(new ImageAltTextValidator());
