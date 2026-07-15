# Progress

**ID:** UI-PR-009
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | number | (required) | Current status value (clamps between 0 and 100) |
| label | string | undefined | Display label and screen reader label |
| variant | 'default' \| 'success' \| 'danger' | 'default' | Color variations |

## Variants
- `default`: brand primary color fill (`bg-primary`)
- `success`: green color fill (`bg-success`)
- `danger`: red color fill (`bg-danger`)

## Accessibility
- WCAG: AA
- Screen Reader: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax="100"` automatically applied to ensure accurate screen reader reading.

## Theme Tokens Used
- `--color-primary`, `--color-success`, `--color-danger`
- `--color-surface-secondary`, `--color-border`
- `--radius-full`

## Keyboard Support
- Purely presentation loading element.

## Composition Rules
- Use for long-running processes (e.g. file uploads, multi-step actions).

## Breaking Changes
(none)

## Migration Notes
(none)
