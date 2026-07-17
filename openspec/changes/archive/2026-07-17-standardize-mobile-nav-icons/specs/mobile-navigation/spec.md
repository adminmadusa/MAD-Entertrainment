## ADDED Requirements

### Requirement: Unified Mobile Navigation Icons
The mobile navigation bar SHALL display icons for Home, Browse Events, My Tickets, and Profile/Login that are imported from the shared design system (`@mad/ui`).

#### Scenario: Visual consistency in mobile navigation
- **WHEN** the mobile bottom navigation bar is rendered
- **THEN** the icons for Home, Browse Events, My Tickets, and Profile/Login SHALL be Lucide-react elements provided by `@mad/ui/icons`
- **AND** they SHALL inherit unified stroke width and scaling tokens
