---
name: code-clean
description: Audit repository code for duplication, dead code, architectural boundaries, naming conventions, and file complexity.
---

# Code Clean Skill

## Purpose

Ensure every implementation, refactor, audit, or code review improves repository quality instead of introducing technical debt.

This skill executes **before any code is written**.

Its primary objective is to verify whether existing code can be reused, identify unnecessary code, detect duplication, enforce architecture standards, and maintain a clean, consistent repository.

---

# Objectives

The skill must verify and report:

- Duplicate code
- Duplicate functionality
- Dead code
- Legacy code
- Unused files
- Orphan files
- Unused exports
- Unused imports
- Unused variables
- Unused types
- Unused interfaces
- Unused hooks
- Unused components
- Unused utilities
- Naming inconsistencies
- Existing implementations that should be reused
- Architecture violations
- Repository hygiene issues
- File complexity
- Code ownership
- Frontend/backend alignment

---

# Execution Rules

Always perform repository analysis before proposing or writing code.

Never assume missing functionality.

Search the repository first.

Prefer extending existing implementations over creating new ones.

Do not duplicate business logic.

Every recommendation must be backed by repository evidence.

---

# Audit Checklist

## 1. Duplicate Detection

Detect:

- Duplicate business logic
- Duplicate calculations
- Duplicate validation
- Duplicate API calls
- Duplicate services
- Duplicate utilities
- Duplicate hooks
- Duplicate components
- Duplicate schemas
- Duplicate constants

### Semantic Duplicate Detection

Identify functionality implemented under different names.

Examples

```
calculateTotal()
computeTotal()
getFinalAmount()
```

```
useCountdown()
useTimer()
```

```
sendNotification()
createNotification()
```

Recommendation

- Reuse existing implementation
- Consolidate
- Extract shared abstraction
- Remove duplicate

---

## 2. Existing Implementation Audit

Before creating anything verify whether an implementation already exists.

Search for:

- Components
- Hooks
- Services
- Utilities
- Contexts
- Validators
- Middleware
- Helpers
- API handlers
- Business rules

Never introduce

```
useAuthNew()
```

when

```
useAuth()
```

already satisfies the requirement.

---

## 3. Dead Code Audit

Detect

- Never executed
- Never imported
- Never referenced
- Commented code
- Disabled code
- Temporary experiments
- Obsolete feature flags
- Unreachable branches

Classify

- Safe to remove
- Requires verification
- Keep

---

## 4. Orphan File Audit

Identify

- Components imported nowhere
- Hooks imported nowhere
- Utilities imported nowhere
- Pages unreachable
- Unused assets
- Unused schemas
- Unused tests
- Legacy configuration

Report

- File
- References
- Safe removal
- Risk

---

## 5. Legacy Audit

Detect

- Compatibility layers
- Migration code
- Temporary fixes
- TODO workarounds
- Deprecated flows
- Legacy architecture
- Old feature implementations

Classify

- Keep
- Refactor
- Replace
- Remove

---

## 6. Import Audit

Verify

- Unused imports
- Duplicate imports
- Circular dependencies
- Deep imports
- Invalid paths
- Wrong ownership

---

## 7. Variable Audit

Detect

- Unused variables
- Unused parameters
- Unused state
- Unused refs
- Unused memoization
- Unused callbacks
- Unused effects
- Redundant state

---

## 8. Naming Audit

Verify consistency across

- Files
- Folders
- Components
- Hooks
- Services
- Utilities
- Types
- Interfaces
- Enums
- Constants
- API routes

Examples

Bad

```
UserService.ts
AUTH.ts
booking_manager.ts
user-utils.ts
```

Good

```
user.service.ts
auth.constants.ts
booking.manager.ts
user.utils.ts
```

---

## 9. Reuse Audit

Before introducing new code verify whether existing code can be extended.

Review

- Components
- Hooks
- Services
- Utilities
- Validators
- Shared packages
- Business logic

Recommendation

- Extend existing
- Extract shared logic
- Consolidate
- Reuse directly

---

## 10. Architecture Audit

Verify

- Layer ownership
- Package boundaries
- Business logic placement
- Validation ownership
- Shared package usage
- Dependency direction
- Module cohesion

Detect

- Business logic inside UI
- Database logic inside controllers
- Duplicate validation
- Architecture drift

---

## 11. Repository Hygiene

Review

- Folder structure
- File placement
- Naming consistency
- Barrel exports
- Import organization
- Shared package usage
- Dependency cleanliness

Detect

- Wrong ownership
- Wrong placement
- Technical debt
- Repository drift

---

## 12. File Quality Audit

Measure

- File size
- Responsibilities
- Complexity
- Coupling
- Cohesion
- Maintainability
- Readability

Thresholds

| Lines | Recommendation |
|--------|----------------|
| 400+ | Review |
| 600+ | Refactor Candidate |
| 800+ | High Priority Refactor |

---

## 13. Frontend / Backend Alignment

Verify

- API contracts
- Validation rules
- DTOs
- Response types
- Business rules
- Ownership boundaries

Detect

- Validation drift
- Response mismatch
- Duplicate business logic
- Ownership conflicts

---

## 14. Hallucination Prevention

Before proposing new code

Search repository for

- Existing components
- Existing services
- Existing utilities
- Existing hooks
- Existing validators
- Existing APIs
- Existing helpers

Do not recommend creating new code unless repository evidence confirms no suitable implementation exists.

---

# 15. Evidence Requirements

Every finding must include

- File
- Symbol
- Type
- Reference
- Reason
- Risk
- Recommendation

No assumptions.

No speculative findings.

Repository evidence is mandatory.

---

# Quality Gates

Before implementation confirm

- No duplicate implementation exists
- Existing functionality cannot be reused
- Architecture remains consistent
- Naming follows conventions
- Repository remains cleaner after changes
- No dead code introduced
- No orphan files created
- No unused imports or variables remain

---

# Deliverables

Return

## Executive Summary

## Findings

### Duplicate Code

### Semantic Duplicates

### Dead Code

### Legacy Code

### Orphan Files

### Import Issues

### Variable Issues

### Naming Issues

### Reuse Opportunities

### Architecture Issues

### Repository Hygiene

### Frontend/Backend Alignment

### File Complexity

---

# Repository Health Score

Provide scores for

- Duplicate Code
- Dead Code
- Legacy Code
- Naming Consistency
- Reusability
- Maintainability
- Architecture
- Repository Hygiene
- Technical Debt
- Overall Repository Health

---

# Final Recommendations

Clearly identify

- Safe to remove
- Should reuse
- Should consolidate
- Should refactor
- Must keep
- High-risk changes
- Future maintenance risks
- Smallest high-impact cleanup
- Next recommended cleanup task

---

# Success Criteria

A successful execution ensures that:

- No duplicate functionality is introduced.
- Existing implementations are reused whenever possible.
- Dead and legacy code is identified with evidence.
- Repository structure remains consistent.
- Naming follows established conventions.
- File complexity is reduced where appropriate.
- Technical debt decreases after every change.
- Every recommendation is supported by repository evidence.
