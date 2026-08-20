export interface DOMOverflowItem {
  selector: string;
  outerHTML: string;
  rect: {
    left: number;
    right: number;
    width: number;
  };
}

export interface AccessibilityViolationItem {
  selector: string;
  outerHTML: string;
  message: string;
}

// Common helper to generate a unique CSS selector for an element
export function getUniqueSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  let path = el.tagName.toLowerCase();
  let parent = el.parentElement;
  while (parent) {
    const index = Array.from(parent.children).indexOf(el) + 1;
    path = `${parent.tagName.toLowerCase()} > ${path}:nth-child(${index})`;
    el = parent;
    parent = parent.parentElement;
  }
  return path;
}

export function detectDOMOverflows(viewportWidth: number): DOMOverflowItem[] {
  const overflows: DOMOverflowItem[] = [];

  const allElements = document.querySelectorAll('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i] as HTMLElement;

    // Ignore hidden or script/style elements
    const style = window.getComputedStyle(el);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      ['script', 'style', 'link', 'meta', 'head'].includes(el.tagName.toLowerCase())
    ) {
      continue;
    }

    const rect = el.getBoundingClientRect();
    if (rect.right > viewportWidth + 0.5 && rect.width > 0) {
      // Make sure overflow-x hidden is not ignoring it
      let isIgnoredByOverflow = false;
      let curr: HTMLElement | null = el;
      while (curr) {
        const currStyle = window.getComputedStyle(curr);
        if (currStyle.overflowX === 'hidden') {
          isIgnoredByOverflow = true;
          break;
        }
        curr = curr.parentElement;
      }

      if (!isIgnoredByOverflow) {
        overflows.push({
          selector: getUniqueSelector(el),
          outerHTML: el.outerHTML.substring(0, 150),
          rect: {
            left: rect.left,
            right: rect.right,
            width: rect.width
          }
        });
      }
    }
  }

  return overflows;
}

export const AccessibilityDOM = {
  detectImageAltViolations(): AccessibilityViolationItem[] {
    const violations: AccessibilityViolationItem[] = [];

    // Find all <img> elements
    const images = document.querySelectorAll('img');

    // Helper to check if an element or any of its parents is hidden or decorative
    const isHiddenOrDecorative = (el: HTMLElement): boolean => {
      let curr: HTMLElement | null = el;
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
      const img = images[i] as HTMLElement;

      // Skip if hidden or decorative
      if (isHiddenOrDecorative(img)) {
        continue;
      }

      const alt = img.getAttribute('alt');

      // 1. Missing alt attribute
      if (alt === null) {
        violations.push({
          selector: getUniqueSelector(img),
          outerHTML: img.outerHTML.substring(0, 150),
          message: 'Image element is missing the alt attribute.'
        });
        continue;
      }

      // 2. Empty alt text on non-decorative images
      // (Since we already filtered out images with role="presentation"/"none" or aria-hidden="true")
      if (alt.trim() === '') {
        violations.push({
          selector: getUniqueSelector(img),
          outerHTML: img.outerHTML.substring(0, 150),
          message: 'Image element has empty alt attribute but is not marked as decorative (requires role="presentation", role="none", or aria-hidden="true").'
        });
      }
    }

    return violations;
  }
};
