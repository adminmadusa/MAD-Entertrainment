# Alert

**ID:** UI-CP-002  
**Status:** Preview  
**Since:** 1.3.0  
**Last Reviewed:** 2026-07-06  
**Owner:** platform  
**Group:** composites

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'info' \| 'success' \| 'warning' \| 'danger' | 'info' | Semantic styling preset |
| title | string | undefined | Bold header section text |
| onDismiss | () => void | undefined | Fires action close button trigger |
| icon | ReactNode | (default icon) | Custom override icon element |

## Variants
- `info`: Blue styled backdrop and text colors
- `success`: Green styled elements
- `warning`: Yellow/Amber styled elements
- `danger`: Red styled elements

## Accessibility
- WCAG: AA
- Screen Reader: `role="alert"` applied so screen readers immediately read the message on render.

## Theme Tokens Used
- `--color-info`, `--color-success`, `--color-warning`, `--color-danger`
- `--color-surface-secondary` (dismiss button hover backdrop)
- `--radius-lg`
- `--transition-duration-base`

## Keyboard Support
- Standard keyboard focus routing for the close button.

## Composition Rules
- Used for inline notices, toast panels, and message boxes.

## Breaking Changes
(none)

## Migration Notes
(none)
