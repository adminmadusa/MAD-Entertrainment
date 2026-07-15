# Textarea

**ID:** UI-PR-004
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| error | string | undefined | Renders an alert message and colors borders red |
| showCharacterCount | boolean | false | Displays character count. Requires `maxLength` |

## Variants
- Normal: standard custom-properties border
- Error: red custom-properties border (`--color-danger`)
- Disabled: opacity 50% with `cursor-not-allowed`

## Accessibility
- WCAG: AA
- Screen Reader: native `<textarea>` element. If `error` is present, `aria-invalid` is automatically set to true and `aria-describedby` links to the error element which uses `role="alert"`.

## Theme Tokens Used
- `--color-border`
- `--color-primary`
- `--color-danger`
- `--color-surface-secondary`

## Keyboard Support
- Standard focus navigation (Tab) and typing events.

## Composition Rules
- Combine with `Label` inside a `FormField` for standard form textareas.

## Breaking Changes
(none)

## Migration Notes
(none)
