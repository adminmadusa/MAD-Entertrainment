# Functional Testing Report — OPS-001

- **Owner**: QA Engineering
- **Status**: PASSED
- **Verification Date**: 2026-06-27

---

## 1. Public Site Navigation

### ✅ Verified
- **Homepage (`/`)**: Renders main hero header, navigation links, and upcoming events layout.
- **Events Listing (`/events`)**: Filters (MAD Events, DJ Nights) and event listing cards render correctly.
- **Support accordion (`/support`)**: Expand/collapse functionality works. Contact form submit handles errors gracefully.
- **DJ Operators (`/dj-operators`)**: Shows all active DJ profiles, genre tags, and availability status.
- **Custom 404 (`/non-existent-page`)**: Branded custom 404 layout matches the MAD design guidelines.
- **Site Files**: `/robots.txt` and `/sitemap.xml` return valid payloads.

---

## 2. Authentication & Authorization

### ✅ Verified
- **Email OTP flow**: Direct user email submission enqueues transactional code requests; OTP view renders.
- **Login Guard**: Unauthenticated requests to `/dashboard` redirect clean to `/login`.

---

## 3. Booking & Payments

### ✅ Verified
- **Ticket Selection**: Event ticket configurations, counts, and prices are accurately displayed on checkout paths.
- **Mock Checkout**: Integration with Razorpay Sandbox executes simulated card payments successfully.
- **Confirmation page**: Resolves references, generates seat maps, and updates ticket status codes.

---

## 4. Telemetry Restrictions

### ⚠ Pending Production Verification
- **Google OAuth Login**: Google Sign-In SDK redirect requires matching production callback domains.
- **ZeptoMail Delivery**: Dynamic inbox delivery validation in production.

---

## 5. Verdict
**PASS**: The application logic and state handlers conform to functional standards.
