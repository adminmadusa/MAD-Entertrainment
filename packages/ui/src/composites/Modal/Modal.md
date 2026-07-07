# Modal

**ID:** UI-CP-003  
**Status:** Preview  
**Since:** 1.3.0  
**Last Reviewed:** 2026-07-06  
**Owner:** platform  
**Group:** composites

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | boolean | (required) | Controls visibility |
| onClose | () => void | (required) | Callback when dismissing |
| size | 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full' | 'md' | Physical width constraints |
| showCloseButton | boolean | false | Toggles close icon display |
| closeOnBackdropClick | boolean | false | Toggles click-backdrop-to-dismiss |
| enableSwipeToClose | boolean | false | Toggles mobile swipe-down-to-dismiss |
| ariaLabelledBy | string | undefined | Reference to title heading ID |
| ariaDescribedBy | string | undefined | Reference to description ID |

## Variants
Sizes scale from `sm` to `xl`, plus `full` rendering modal full screen for mobile layouts or heavy operations.

## Accessibility
- WCAG: AA
- Screen Reader: `role="dialog"`, `aria-modal="true"`. Restricts tab focus inside the modal context via `useFocusTrap` hook.
- Keyboard: `Escape` key closes the modal (integrated via `useFocusTrap`).

## Theme Tokens Used
- `--color-surface-secondary` (modal window body background)
- `--color-border`
- `--z-modal`
- `--radius-lg`

## Keyboard Support
- Focus trapped while open. Escape key closes the modal.

## Composition Rules
- Used for heavy interactive prompts, detailed form completion tasks, and warning alerts that require user block confirmation.

## Breaking Changes
(none)

## Migration Notes
(none)
