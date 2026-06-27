# Environment Validation Report — STAGING-001

- **Owner**: DevOps / Infrastructure Team
- **Status**: PASSED WITH MOCKS
- **Environment**: Local Staging (localhost)
- **Verification Date**: 2026-06-27

---

## 1. Environment Variable Configuration
The backend Express server and Next.js frontend load environment variables correctly from `.env` and `.env.local` respectively.

| Component | Scope | Configured | Status |
|---|---|---|---|
| Node API | CORS Origins | `http://localhost:3000`, `http://localhost:3002`, production domains | ✅ Correct |
| Node API | Port | `3001` | ✅ Correct |
| Node API | DB / Redis | Atlas (Sandbox/Dev), Redis Cloud | ✅ Connected |
| Next.js Web | API URL | `http://127.0.0.1:3001/api` | ✅ Correct |
| Next.js Web | Google OAuth | Client ID configured | ✅ Correct |

---

## 2. Infrastructure Connectivity
- **MongoDB**: Successfully connected to Atlas Dev cluster (`mongodb+srv://mad:MV_kalyan9@mad.19rg6hu.mongodb.net/?appName=Mad`).
- **Redis**: Connected successfully to Redis Cloud instance (`redis://mad:MV_kalyan9@stew-collaborative-macrofresh-13290.db.redis.io:14748`).
- **Cloudinary**: Cloud name `dwl1btkus` loaded successfully.
- **SMTP / ZeptoMail**: Configured to `smtp.zeptomail.in:587` with ZeptoMail API URL integration.
- **Razorpay**: Configured to run in Sandbox/Mock Mode (`MOCK_PAYMENTS=true`) due to dev environment staging configuration.

---

## 3. SSL/TLS & DNS Validation
- Staging operates locally (`http://localhost`); DNS and SSL configuration are inherited from Vercel/Render DNS settings for the live domains `mad.esparex.in` and `test.esparex.in` (wildcard DNS pointing to Vercel/Render edge).
- Localhost uses standard unencrypted HTTP; production endpoints strictly enforce SSL/TLS via Vercel Edge.

---

## 4. Verdict
**PASS**: Environment is verified. Mock settings are active for Razorpay checkout validation.
