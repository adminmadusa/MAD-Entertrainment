# Input

**ID:** UI-PR-003
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| error | string | undefined | Renders an alert message and colors borders red |
| prefix | ReactNode | undefined | Inline element placed before text input |
| suffix | ReactNode | undefined | Inline element placed after text input |

## Variants
- Normal: standard custom-properties border
- Error: red custom-properties border (`--color-danger`)
- Disabled: opacity 50% with `cursor-not-allowed`

## Accessibility
- WCAG: AA
- Screen Reader: native `<input>` element. If `error` is present, `aria-invalid` is automatically set to true and `aria-describedby` links to the error element which uses `role="alert"`.

## Theme Tokens Used
- `--color-border`
- `--color-primary`
- `--color-danger`
- `--color-surface-secondary`

## Keyboard Support
- Standard input focus navigation (Tab) and typing events.

## Composition Rules
- Combine with `Label` inside a `FormField` for standard form inputs.
- Use `prefix` for icons, currency symbols, etc. Use `suffix` for loading indicators, clear buttons, visibility toggles, etc.

## Breaking Changes
(none)

## Migration Notes
(none)
