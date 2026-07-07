---
title: AI Operating System — Deployment Map Summary
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/repository/README.md
supersedes: []
---

# Deployment Map Summary

This document summarizes the hosting environment matrix, deployment topology, and environment constraints of the MAD Entertrainment platform.

---

## 1. Hosting Environment Matrix

| Parameter | Local Development | Preview Deployments | Staging/Testing | Production |
| :--- | :--- | :--- | :--- | :--- |
| **Purpose** | Sandbox coding | PR validation | Integration testing | Live customer traffic |
| **Branch** | Local workspace | Pull Request | `develop` | `live` |
| **Hosting** | Local machine | Vercel Serverless | Vercel Serverless | Vercel Serverless (Web/Admin), Render Node Container (API) |
| **URL** | `http://localhost:3000` (Web)<br>`http://localhost:3002` (Admin) | Vercel Preview URL | `https://test.esparex.in` | `https://mad.esparex.in` (Web)<br>`https://madmin.esparex.in` (Admin)<br>`https://apm.esparex.in/api` (API) |
| **Database** | Local MongoDB | MongoDB Atlas Sandbox | MongoDB Atlas Shared | MongoDB Atlas Prod |
| **Redis** | Local Redis | Mock / None | Redis Cloud Shared | Redis Cloud Prod |
| **Payments** | Mock Payments | Sandbox Gateways | Sandbox Gateways | Stripe/Razorpay Live |
| **Email** | Mock SMTP | SMTP Sandbox | SMTP Sandbox | ZeptoMail Gateway |
| **Monitoring** | Console Logging | None | Sentry Alerts | Sentry & Better Uptime |
| **Deployment Trigger** | Manual launch | PR open/synchronize | Git push to `develop` | Git push/merge to `live` |

---

## 2. Infrastructure Topology
* **Vercel Serverless**: Serves `@mad/web` (customer ticket portal) and `@mad/admin` (administrative control panel). Rewrites map `/api/*` directly to Render API server paths.
* **Render Container Service**: Runs the `@mad/server` Express application and background BullMQ workers.
* **MongoDB Atlas Cluster**: Core database storage. Mongoose `autoIndex` is disabled in production environments.
* **Redis Cloud**: backing BullMQ tasks queue and express-rate-limit.
* **Cloudinary CDN**: Image asset bucket for user photo and event banner uploads.
* **External APIs**: Stripe (international card processing), Razorpay (domestic payment card/UPI), ZeptoMail (transactional email dispatch).

---

## 3. Staging/Testing Environment Constraint (Shared Backend Setup)
Our staging/testing environment operates under a shared-backend constraint:
* **Shared Backend Setup**: The Vercel Test frontend (`test.esparex.in`, built from the `develop` branch) routes its requests directly to the production Render API backend (`apm.esparex.in`, built from the `live` branch).
* **Operational Implications**: Actions performed on the test/staging frontend URL (like running booking tests or data mutations) directly modify the production MongoDB database and enqueues tasks in the production Redis cache. Coordination is required to avoid contamination of production analytics.

*Authoritative Source*: [DEPLOYMENT_MAP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/DEPLOYMENT_MAP.md).
