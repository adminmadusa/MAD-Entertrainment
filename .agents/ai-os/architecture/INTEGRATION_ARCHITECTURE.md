---
title: AI Operating System — Integration Architectures
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/architecture/README.md
  - .agents/ai-os/architecture/COMPONENTS.md
supersedes: []
---

# Integration Architectures

This document registers the external system connection adapters, webhook boundaries, and error recovery policies.

---

## 1. External System Interfaces

### Stripe Gateway
* **Purpose**: International payment card transactions.
* **Component Adapter**: `stripe` client library adapter configuration.
* **Webhook Routing**: Callback webhooks route to `/api/payments/stripe/webhook` and verify payloads using the Stripe webhook signing secret key.
* **Error Handling**: Failed API requests throw standard errors; webhook failures are retried by Stripe over 72 hours.

### Razorpay Gateway
* **Purpose**: Domestic UPI and card payment processing.
* **Component Adapter**: `razorpay` client library adapter configuration.
* **Webhook Routing**: Verification webhooks route to `/api/payments/razorpay/webhook` and verify signature payloads.
* **Error Handling**: Transactions require manual database reconciliation if signature callbacks fail.

### ZeptoMail
* **Purpose**: Dispatching verification OTP link passcodes and PDF ticket notifications.
* **Component Adapter**: Nodemailer SMTP configuration using ZeptoMail gateway.
* **Error Handling**: SMTP dispatch failures are caught by BullMQ workers and retried using exponential backoffs.

### Cloudinary
* **Purpose**: Image CDN for storage of avatars, barcodes, and performance banners.
* **Component Adapter**: Cloudinary SDK adapter wrapper.
* **Error Handling**: File upload errors block operational changes; assets are cached locally before transmission.
