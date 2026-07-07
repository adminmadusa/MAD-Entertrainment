# EmptyState

**ID:** UI-CP-007
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** composites

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | (required) | Bold header title |
| description | string | undefined | Supporting caption detail |
| icon | ReactNode | undefined | Large central icon component |
| action | ReactNode | undefined | CTA action element (e.g. Button) |

## Variants
- Single dashed container styled with centralized layouts.

## Accessibility
- WCAG: AA
- Screen Reader: uses standard headers (`<h4>`) and paragraphs to read content accurately.

## Theme Tokens Used
- `--color-border`
- `--color-text-primary`, `--color-text-muted`
- `--radius-lg`

## Keyboard Support
- Purely presentation wrapper. Keyboard focus is routed to the action child (if present).

## Composition Rules
- Use to display empty data list alerts (e.g. No Bookings Found, No Active DJ Operators, No Coupons Found).

## Breaking Changes
(none)

## Migration Notes
(none)
