# VAL-UX-003

Missing Error State

---

## Purpose

Detects async components that do not handle the error case.

---

## Description

This rule enforces repository consistency and compliance in the UX domain. It performs static validation checks to maintain quality standards across all modules.

---

## Why This Rule Exists

When errors are silently ignored, users see a blank or stale UI with no indication of what went wrong and no way to recover. Unhandled errors are invisible bugs from the user's perspective.

---

## Detection Logic

Scans TSX components using useQuery, useSWR, or useEffect+fetch patterns for the absence of an isError conditional rendering branch.

---

## Severity

**HIGH**

This severity was assigned to ensure appropriate action based on the risk level. Higher severity rules indicate potential blocker risks to build or deployment stability.

---

## CI Policy

**WARN**

Violations are logged as warnings and must be reviewed before final merge.

---

## Owner

UI UX Guild

---

## Category

UX

---

## Governance Source

| Field | Value |
|-------|-------|
| Standard | UI-001 |
| Document | UI_UX_GOVERNANCE.md |
| Section | 22. Merge Gate |

---

## Examples

### ✅ Compliant

```tsx
if (isError) return <ErrorState onRetry={() => refetch()} />;
```

### ❌ Non-Compliant

```tsx
const { data, isError } = useQuery(...);
// isError never checked — error is invisible.
return <BookingTable bookings={data ?? []} />;
```

---

## Acceptance Criteria

**PASS**: Every async data-fetching component includes an isError conditional rendering branch with a retry mechanism.

**FAIL**: Any component with a useQuery/useSWR/fetch pattern has no error branch.

---

## Common False Positives

Server components or SSR pages where errors are handled at the framework boundary may not need an inline error state.

---

## Remediation

Add an error state branch that renders a user-friendly error message and a Retry button. Wrap page-level components in an ErrorBoundary. See INTERACTION_GUIDELINES.md Error Handling.

---

## Related Rules

Refer to the main [REGISTRY.md](../REGISTRY.md) for related rules in the UX category.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
