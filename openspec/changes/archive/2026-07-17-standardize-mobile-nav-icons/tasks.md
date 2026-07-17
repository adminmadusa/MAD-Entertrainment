## 1. Export Icons in Design System

- [x] 1.1 Verify and export `Home` and `Ticket` icons from `packages/ui/src/icons/index.ts` if not already present.

## 2. Refactor Web Bottom Navigation

- [x] 2.1 Remove the hand-rolled inline SVG definitions (`HomeIcon`, `TicketIcon`, `UserIcon`) from `apps/web/src/components/layout/BottomNavigation.tsx`.
- [x] 2.2 Import the unified icons (`Home`, `Ticket`, `User`) from `@mad/ui/icons`.
- [x] 2.3 Update the JSX rendering in `BottomNavigation.tsx` to use the imported shared icon elements.
- [x] 2.4 Verify that compilation is clean and run type checks.
