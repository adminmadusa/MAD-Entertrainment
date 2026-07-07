# IconButton

**ID:** UI-PR-002
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| aria-label | string | (required) | Accessible text label for screen readers |
| variant | 'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'outline' | 'primary' | Visual style variant |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Size of the button |
| isLoading | boolean | false | Displays loading spinner inside |

## Variants
Inherits all variants from `Button`.

## Accessibility
- WCAG: AA
- Screen Reader: Enforces required `aria-label` attribute (TypeScript compilation fails if missing).

## Theme Tokens Used
Inherits all tokens from `Button`.

## Keyboard Support
- Standard button keyboard support (Enter/Space trigger).

## Composition Rules
- Use for icon-only toolbar or utility actions. Never put text inside child elements; only put a single icon component.

## Breaking Changes
(none)

## Migration Notes
(none)
