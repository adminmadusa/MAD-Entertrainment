/**
 * Client-side script evaluated in browser to check for horizontal overflows.
 * Evaluates document elements and reports detailed bounding rect misalignments.
 */
export interface DOMOverflowItem {
  selector: string;
  outerHTML: string;
  rect: {
    left: number;
    right: number;
    width: number;
  };
}

export function detectDOMOverflows(viewportWidth: number): DOMOverflowItem[] {
  const overflows: DOMOverflowItem[] = [];

  // Helper to generate a unique CSS selector for an element
  const getUniqueSelector = (el: HTMLElement): string => {
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
  };

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
    // Check if right bound exceeds viewport width by more than a 0.5px subpixel rendering margin
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
