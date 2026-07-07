# Stack

**ID:** UI-LY-003
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** layouts

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| direction | 'row' \| 'col' | 'col' | Main layout orientation |
| gap | 'none' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Distance spacing between inner children |
| align | 'start' \| 'center' \| 'end' \| 'stretch' | 'stretch' | Cross-axis children alignment |
| justify | 'start' \| 'center' \| 'end' \| 'between' \| 'around' | 'start' | Main-axis children alignment |
| wrap | boolean | false | Toggles multi-line item wrapping |

## Variants
Orientations include vertical lists (`col`) and horizontal lists (`row`). Gaps scale from `none` to `xl`.

## Accessibility
- WCAG: AA
- Presentation container that groups children.

## Theme Tokens Used
- Spacing gap classes mapping standard presets.

## Keyboard Support
- Standard presentation container.

## Composition Rules
- Use to align form field columns, toolbar action blocks, and card headers.

## Breaking Changes
(none)

## Migration Notes
(none)
