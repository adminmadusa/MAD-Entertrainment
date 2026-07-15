# Label

**ID:** UI-PR-005
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| htmlFor | string | undefined | Associates the label with an input component |
| required | boolean | false | Displays red asterisk representing required input |
| hint | string | undefined | Supporting inline label caption text |

## Variants
No specific visual variants; standard styling aligned with design system typography.

## Accessibility
- WCAG: AA
- Screen Reader: `aria-hidden="true"` applied to required asterisk to avoid screen reader clutter.

## Theme Tokens Used
- `--color-text-primary`
- `--color-text-muted`
- `--color-danger` (required asterisk)

## Keyboard Support
- Standard label click routing.

## Composition Rules
- Use inside `FormField` to label input/textarea components.

## Breaking Changes
(none)

## Migration Notes
(none)
