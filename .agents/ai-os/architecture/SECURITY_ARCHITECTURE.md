---
title: AI Operating System — Security Architecture
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/architecture/README.md
  - .agents/ai-os/domain/AUTHENTICATION.md
supersedes: []
---

# Security Architecture

This document describes the platform session models, role-based access restrictions, and secret management patterns.

---

## 1. Session & Token Architecture
* **Token Model**: Stateless JSON Web Tokens (JWT) signed with HS256 algorithms (`signUserToken` utilities). Tokens are generated upon OTP verification and contain user identification and role parameters.
* **Storage & Transmission**: Client frontends transmit JWTs using secure, HTTP-only cookie headers or Authorization Bearer credentials.
* **Refresh Flow**: Refresh tokens are stored in the database (`RefreshTokenModel`) with a strict single-use policy. Re-using a refresh token invalidates the entire session family to prevent token hijacking.

## 2. Role-Based Access Control (RBAC)
* **Middleware Boundaries**: Admin route endpoints are guarded by authorization middleware verifying `user.role`.
* **Access Rules**:
  - `super_admin`: Full system modifications.
  - `admin` / `manager`: Can write event schedules, ticket profiles, and coupon rules.
  - `support`: Restricted to reading bookings and initiating refunds.
  - `scanner`: Restricted strictly to executing ticket scan check-ins (`scanner.controller.ts`).

## 3. Cryptographic Storage & Secrets
* **OTP Passcode Hashing**: Plaintext 6-digit OTP passcodes are hashed using SHA-256 before being committed to the database (`MagicTokenModel`).
* **Secret Storage**: Encryption keys, database strings, and Stripe secret credentials must reside in environmental files outside version control, validated at runtime using Zod environment schemas.
