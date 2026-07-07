# Spinner

**ID:** UI-PR-007
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| size | 'sm' \| 'md' \| 'lg' | 'md' | Visual scale size of the spinner |
| aria-label | string | 'Loading' | Accessible label for screen readers |

## Variants
No specific visual variants; standard SVG ring rotation.

## Accessibility
- WCAG: AA
- Screen Reader: `role="status"` and configurable `aria-label` (defaults to "Loading")

## Theme Tokens Used
- `--transition-duration-slow` for spin animation speed (optional custom override, falls back to spin keyframe)
- CSS classes consume standard HSL color transitions and borders

## Keyboard Support
- Non-focusable container.

## Composition Rules
- Use inside `Button` when `isLoading` is enabled.
- Use inside page-level or block-level elements for initial load placeholders.

## Breaking Changes
(none)

## Migration Notes
(none)
