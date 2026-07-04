---
title: AI Operating System — Authentication Domain
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
  - .agents/ai-os/domain/GLOSSARY.md
  - .agents/ai-os/domain/BUSINESS_RULES.md
supersedes: []
---

# Authentication Domain

This document describes the business workflows, actors, and rules governing identity verification and access permissions.

---

## 1. Business Actors & Responsibilities
* **Customer**: Can request login codes, verify identity to view ticket purchases, and access their personal profile dashboards.
* **Admin Roles**:
  - **Super Admin**: Full platform access.
  - **Admin**: Event and operational management.
  - **Manager**: Performance analytics and ticket configurations.
  - **Support**: Customer inquiries and refund processing.
  - **Scanner**: Access restricted to verifying entry tickets.

---

## 2. Workflows

### Passwordless Login & Registration
1. **Request**: User submits an email address (with optional registration metadata: first name, last name, mobile number).
2. **Normalize**: The email address is trimmed and converted to lowercase.
3. **Lock check**: The system verifies the 60-second request cooldown is not active (`BR-AUTH-001`).
4. **Passcode generation**: Generates a secure, 6-digit numeric One-Time Passcode (OTP) valid for 15 minutes (`BR-AUTH-002`).
5. **Dispatch**: Sends the OTP via email to the customer.
6. **Verification**: Customer inputs the OTP. If the OTP matches and is active, a secure session is granted. If the user is new, a profile record is created using the registration metadata.

---

## 3. Invariants & Rules
* **Email Normalization**: All identity actions must match emails using normalized strings to prevent duplicate profiles.
* **OTP One-Time Rule**: Once an OTP token is verified, it is deleted and cannot be reused.
* **Role Separation**: Admins must hold verified roles (`AdminRole`) matching their operational limits.
