# Skeleton

**ID:** UI-PR-008
**Status:** Preview
**Since:** 1.3.0
**Last Reviewed:** 2026-07-06
**Owner:** platform
**Group:** primitives

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| width | string \| number | '100%' | Width style mapping |
| height | string \| number | '1rem' | Height style mapping |
| rounded | boolean \| string | true | Radius mapping. If true, standard rounded-md is used |

## Variants
- Simple pulsing container with configurable dimensions and corner radiuses.

## Accessibility
- WCAG: AA
- Screen Reader: `aria-hidden="true"` enforced automatically so screen readers bypass loading templates.

## Theme Tokens Used
- `--radius-md` for standard corner rounding.
- Uses standard keyframe animations (`animate-pulse`) and translucent overlays.

## Keyboard Support
- Purely presentation placeholder.

## Composition Rules
- Use to compose complex structural layouts resembling actual page elements during fetch wait times.
- `EventGridSkeleton` is provided as a backward-compatible shim.

## Breaking Changes
(none)

## Migration Notes
(none)
