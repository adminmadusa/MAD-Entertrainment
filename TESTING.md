# MAD Entertrainment — Testing Guide

- **Owner**: QA Owner
- **Status**: Active
- **Version**: 1.0
- **Review Cycle**: Ongoing
- **Last Updated**: 2026-06-25
- **Related Documents:**
  - [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/README.md)
  - [REPOSITORY_GOVERNANCE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/REPOSITORY_GOVERNANCE.md)

---

## Purpose

This document explains how to verify changes safely within the MAD Entertrainment repository.

Testing requirements vary by change type. Always run the minimum applicable verification before creating a PR.

---

## Core Verification Commands

Run the commands relevant to the area being modified.

### Web Application

```bash
pnpm --filter @mad/web lint
pnpm --filter @mad/web type-check
pnpm --filter @mad/web build
```

### Admin Application

```bash
pnpm --filter @mad/admin lint
pnpm --filter @mad/admin type-check
pnpm --filter @mad/admin build
```

### Server

```bash
pnpm --filter @mad/server build
```

### Repository-Wide

```bash
pnpm lint
pnpm test
pnpm build
```

---

## Verification Requirements

### UI-Only Changes

Examples:

* Mobile spacing fixes
* Styling updates
* Layout adjustments
* Responsive improvements

Required:

```bash
pnpm --filter @mad/web lint
pnpm --filter @mad/web type-check
pnpm --filter @mad/web build
```

Manual verification required.

---

### Authentication Changes

Examples:

* Login flow
* Registration flow
* OTP flow
* Session handling
* Dashboard access

Required:

```bash
pnpm --filter @mad/web lint
pnpm --filter @mad/web type-check
pnpm --filter @mad/web build
```

Manual verification required.

Test:

* Login
* Logout
* Session persistence
* Protected routes

---

### Payment Changes

Examples:

* Checkout
* Booking confirmation
* Payment verification
* Webhooks

Required:

```bash
pnpm lint
pnpm build
```

Manual verification required.

Test:

* Successful payment
* Failed payment
* Duplicate payment protection
* Booking creation
* Ticket delivery

---

### Backend Changes

Examples:

* Controllers
* Services
* Routes
* Validation

Required:

```bash
pnpm build
```

Verify affected endpoints manually.

---

## Mobile Verification Checklist

For mobile UI work verify:

* No horizontal scrolling
* Primary CTA visible
* Forms usable
* Tables readable
* Navigation functional
* Buttons accessible
* Ticket QR codes visible
* No layout clipping

Recommended widths:

* 375px
* 390px
* 430px

---

## PR Verification Summary

Before opening a PR document:

* Commands executed
* Results
* Manual verification performed
* Known limitations
* Rollback plan

---

## Governance

Do not ignore:

* Build failures
* Type errors
* Lint failures

Do not merge code that has not been verified.

Refer to:

* README.md
* AGENTS.md
* TODO-AUDIT-FIXES.md
