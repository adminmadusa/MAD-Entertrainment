# LoadingState

**ID:** UI-CP-009
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** composites

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | 'Loading content...' | Accessible and visual description text |

## Variants
- Centered page-level layout featuring a large primary spinner and loading caption text.

## Accessibility
- WCAG: AA
- Screen Reader: `aria-live="polite"` and `aria-busy="true"` automatically set on container wrapper. Inherits `role="status"` on internal `Spinner`.

## Theme Tokens Used
- `--color-primary`
- `--color-text-secondary`

## Keyboard Support
- Purely presentation loading element.

## Composition Rules
- Use for page-level initial fetch states or heavy overlay actions representing async operations.

## Breaking Changes
(none)

## Migration Notes
(none)
