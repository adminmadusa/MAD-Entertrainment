# Drawer

**ID:** UI-CP-004
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** composites

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | boolean | (required) | Controls visibility |
| onClose | () => void | (required) | Action fired on dismiss |
| side | 'bottom' \| 'left' \| 'right' | 'right' | Placement side |
| title | string | undefined | Bold header section text |

## Variants
Supports bottom sheets (`bottom`) for mobile viewports, or slide menus (`left`, `right`) representing side drawers.

## Accessibility
- WCAG: AA
- Screen Reader: `role="dialog"`, `aria-modal="true"`. Restricts tab focus inside the active context via `useFocusTrap` hook.
- Keyboard: Escape key triggers `onClose` callback.

## Theme Tokens Used
- `--color-surface-secondary` (drawer panel body background)
- `--color-border`
- `--z-modal`
- `--radius-lg` (rounded borders on outer edges)

## Keyboard Support
- Traps focus while open. Escape key closes the drawer.

## Composition Rules
- Use for mobile navigations, filter side panels, and utility forms.

## Breaking Changes
(none)

## Migration Notes
(none)
