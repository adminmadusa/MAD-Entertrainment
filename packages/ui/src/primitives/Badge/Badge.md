# Badge

**ID:** UI-PR-006  
**Status:** Preview  
**Since:** 1.3.0  
**Last Reviewed:** 2026-07-06  
**Owner:** platform  
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'success' \| 'warning' \| 'danger' \| 'info' \| 'default' | 'default' | Semantic visual styling |
| size | 'sm' \| 'md' | 'md' | Physical padding and font size |

## Variants
- `default`: Grey backdrop border
- `success`: Transparent green background with solid green border
- `warning`: Transparent yellow/amber background with solid yellow border
- `danger`: Transparent red background with solid red border
- `info`: Transparent blue background with solid blue border

## Accessibility
- WCAG: AA
- Text colors inside transparent borders meet WCAG AA contrast ratio requirements.

## Theme Tokens Used
- `--color-success`, `--color-warning`, `--color-danger`, `--color-info`
- `--color-border`, `--color-text-primary`
- `--radius-sm`, `--radius-md`

## Keyboard Support
- Purely presentation chip. Non-interactive.

## Composition Rules
- Used to signify statuses (e.g. Completed, Pending, Blocked, Draft).
- Avoid putting large texts inside Badges. Keep to 1-2 words.

## Breaking Changes
(none)

## Migration Notes
(none)
