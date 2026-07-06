# ErrorState

**ID:** UI-CP-008  
**Status:** Preview  
**Since:** 1.3.0  
**Last Reviewed:** 2026-07-06  
**Owner:** platform  
**Group:** composites

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | (required) | Bold error title message |
| description | string | undefined | Supporting caption detail |
| icon | ReactNode | (default icon) | Custom override icon element |
| onRetry | () => void | undefined | Fires action retry button trigger |
| action | ReactNode | undefined | Custom CTA action component |

## Variants
- Single container styled with error boundaries (red border overlay and red text highlights).

## Accessibility
- WCAG: AA
- Screen Reader: `role="alert"` automatically applied to ensure immediate warning notification.

## Theme Tokens Used
- `--color-danger` (border and icon colors)
- `--color-text-primary`, `--color-text-muted`
- `--radius-lg`

## Keyboard Support
- Standard tab focus routing to the action button (Retry).

## Composition Rules
- Used inside error boundary fallbacks, connection error wrappers, and transaction failure dialogs.

## Breaking Changes
(none)

## Migration Notes
(none)
