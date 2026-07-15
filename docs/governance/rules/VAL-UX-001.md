# VAL-UX-001

Missing Loading State

---

## Purpose

Detects async data-fetching components that do not implement a loading state.

---

## Description

This rule enforces repository consistency and compliance in the UX domain. It performs static validation checks to maintain quality standards across all modules.

---

## Why This Rule Exists

Without a loading state, users see a blank or empty interface while data fetches, creating a jarring experience and potential confusion about whether the page is functioning.

---

## Detection Logic

Scans TSX components using useQuery, useSWR, or useEffect+fetch patterns for the absence of an isLoading or isPending conditional rendering branch.

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
| Section | 14. Loading Experience |

---

## Examples

### ✅ Compliant

```tsx
if (isLoading) return <TicketListSkeleton />;
if (isError) return <ErrorState onRetry={refetch} />;
return <TicketList tickets={data} />;
```

### ❌ Non-Compliant

```tsx
const { data } = useQuery(...);
return <TicketList tickets={data ?? []} />;
// No loading branch — blank screen while fetching.
```

---

## Acceptance Criteria

**PASS**: Every async data-fetching component includes an isLoading or isPending conditional rendering branch.

**FAIL**: Any component with a useQuery/useSWR/fetch pattern has no loading branch.

---

## Common False Positives

Components that always receive pre-fetched data (server components, SSR props) may not need a client-side loading state.

---

## Remediation

Add a loading state branch using skeleton screens for loads expected to exceed 1s, or a subtle spinner for shorter operations. See INTERACTION_GUIDELINES.md Loading Patterns.

---

## Related Rules

Refer to the main [REGISTRY.md](../REGISTRY.md) for related rules in the UX category.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — UI-001 governance alignment |
