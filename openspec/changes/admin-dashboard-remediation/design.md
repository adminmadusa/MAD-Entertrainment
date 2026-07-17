# Design: Admin Dashboard Remediation

## Architecture Constraints

- All contrast fixes must be **component-scoped** — do not change `--color-text-muted`
  or `--color-text-secondary` CSS custom properties in `packages/ui/src/styles/shared.css`
- Table responsiveness fix uses `min-w-*` Tailwind class on the inner table node,
  not on the outer card wrapper (which intentionally clips the card border-radius)
- `scope="col"` addition to `TableHead` is additive and safe for both `apps/admin` and `apps/web`
- Sidebar localStorage key: `admin_sidebar_collapsed` (string `"true"` / `"false"`)

## Token Reference

| Token | CSS Var | Resolved | Used For |
| :--- | :--- | :--- | :--- |
| `text-text-muted` | `--color-text-muted` | `#6B7280` | Placeholder text, decorative only |
| `text-text-secondary` | `--color-text-secondary` | `#9CA3AF` | Secondary body text (WCAG AA pass) |

## Contrast Calculations (Measured)

- `#9CA3AF` on `#161D2F` (bg-card) → **6.59:1** ✅ PASS
- `#6B7280` on `#161D2F` (bg-card) → **3.44:1** ❌ FAIL

## PR Sequence

```
PR 1 → PR 2 → PR 3 → PR 4 (gated on PR 2 + parity check)
```

Each PR is one branch push with multiple commits.
PRs 1, 2, and 3 have no dependency on each other but are sequenced
to land accessibility first per governance policy.
