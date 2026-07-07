# Tooltip

**ID:** UI-CP-005
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** composites

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| content | ReactNode | (required) | Tooltip panel popover content |
| side | 'top' \| 'bottom' \| 'left' \| 'right' | 'top' | Placement direction |

## Variants
- Simple hover/focus bubble styled relative to its trigger element.

## Accessibility
- WCAG: AA
- Screen Reader: `role="tooltip"` automatically applied. Displays when trigger element receives focus (`onFocus` event).

## Theme Tokens Used
- `--color-surface-card` (tooltip panel background)
- `--color-border`
- `--radius-sm`
- `--z-popover`
- `--transition-duration-fast`

## Keyboard Support
- Automatically displays when navigating onto the trigger element using `Tab`. Dismisses on `Blur`.

## Composition Rules
- Wrap inline icon buttons or actions with `Tooltip` to clarify their purpose to keyboard/mouse users.

## Breaking Changes
(none)

## Migration Notes
(none)
