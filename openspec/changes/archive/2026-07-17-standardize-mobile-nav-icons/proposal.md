## Why

The mobile bottom navigation component (`BottomNavigation.tsx`) currently uses inline hand-rolled SVGs for the primary tabs (`HomeIcon`, `TicketIcon`, `UserIcon`). This duplicates icon markup locally, deviates from the design system's unified visual styling (stroke weights, scaling, aesthetics), and makes global icon theme updates harder to manage. Replacing them with the shared `@mad/ui/icons` standard aligns the component with MAD engineering guidelines and UI-001 visual consistency policies.

## What Changes

- Modify `BottomNavigation.tsx` in `apps/web` to remove inline SVG definitions for `HomeIcon`, `TicketIcon`, and `UserIcon`.
- Update the component to import and use the standard shared icons `Home`, `Ticket`, and `User` from `@mad/ui` (which are mapped to unified Lucide abstractions).
- Adjust layout/styling properties in `BottomNavigation.tsx` to match the design tokens provided by the `@mad/ui` package.

## Capabilities

### New Capabilities
*None.*

### Modified Capabilities
*None.* (This is a pure implementation refactor with no functional requirement changes).

## Impact

- **Affected Files**: `apps/web/src/components/layout/BottomNavigation.tsx`
- **Dependencies**: `@mad/ui` package icons bundle.
- **Verification**: Mobile viewport smoke testing, visual consistency checks.
