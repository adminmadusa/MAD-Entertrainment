---
title: AI Operating System — Workspace Applications
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/repository/README.md
  - .agents/ai-os/repository/WORKSPACES.md
supersedes: []
---

# Workspace Applications

This document registers and describes the role, runtime target, and key tech stack components of the three primary applications in this monorepo.

---

## 1. @mad/web (Client Ticket Booking Portal)
* **Directory**: `apps/web`
* **Technology Stack**: Next.js 15.1.3 (App Router), React 19, Axios, React Query, Framer Motion, TailwindCSS.
* **Role**: Primary client-facing ticket-selling portal. Allows guests and registered users to view public events, perform seat selection, purchase tickets, and manage their ticket reservations.
* **Build Targets**: Compile output goes to `.next/`.
* **Port Configuration**: Local dev port: `3000`.

---

## 2. @mad/admin (Management Control Panel Panel)
* **Directory**: `apps/admin`
* **Technology Stack**: Next.js 15.1.3 (App Router), React 19, Axios, React Query, Framer Motion, TailwindCSS, Recharts, Next-PWA.
* **Role**: Operator management dashboard. Allows administrative personnel to create/manage events, coupon rules, scan barcodes/QRs for entry validation, and perform manual booking refunds.
* **Build Targets**: Compile output goes to `.next/`.
* **Port Configuration**: Local dev port: `3002`.

---

## 3. @mad/server (Core API Service & Background Worker Hub)
* **Directory**: `apps/server`
* **Technology Stack**: Node.js/TypeScript, Express 4.22.2, Mongoose 8.24.0 (MongoDB Atlas), BullMQ 5.41.3 (Redis Cloud task queuing), Socket.io, Pino logging, Sentry monitoring, Stripe, Razorpay, ZeptoMail (Nodemailer integration).
* **Role**: Stateful backend core API server. Houses the primary business logic (auth endpoints, booking operations, payment processing hooks) and executes BullMQ background workers (for PDF ticket generation, ZeptoMail dispatch, and booking seat locks timeouts).
* **Build Targets**: Compiles to `dist/apps/server/src/server.js`.
* **Dev Runner**: Executed via `tsx watch src/server.ts`.
