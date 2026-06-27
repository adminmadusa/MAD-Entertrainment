# Functional Testing Report — STAGING-001

- **Owner**: QA Engineering / Testing Lead
- **Status**: PASSED
- **Environment**: localhost (Web & Admin)
- **Verification Date**: 2026-06-27

---

## 1. Public Website Validation
We verified all key public routes. All page loads return successful status and render the matching components.

| Route / Feature | Status | Screenshot Reference | Findings |
|---|---|---|---|
| Home Page (`/`) | ✅ PASS | `step_1_home` | Hero loads, active events grid renders correctly. Navbar and Footer visible. |
| Events Page (`/events`) | ✅ PASS | `step_2_events` | Displays event list (HOLI-XPLOSION). Filter pills (All, MAD Events, DJ Nights) are functional. |
| DJ Operators (`/dj-operators`) | ✅ PASS | `step_13_dj_operators` | Renders listing of DJs (DJ Shaan, DJ Swapna) with "Available" badges, genre details, and experience tags. |
| Support Page (`/support`) | ✅ PASS | `step_4_support` | FAQ accordion expands and collapses cleanly. Contact Form renders. |
| Ticket Lookup (`/tickets`) | ✅ PASS | `step_5_tickets` | Input fields for Booking Reference and Payment ID exist. Form validation handles invalid inputs. |
| Legal Page (`/legal/privacy`) | ✅ PASS | `step_11_privacy` | Sidebar Legal Center loads; body shows Privacy Policy text. |
| 404 Handler (`/does-not-exist`) | ✅ PASS | `step_7_404` | Branded "The Beat Has Dropped" 404 page displayed with CTA back to Homepage. |

---

## 2. Authentication Flow
- **OTP Login Flow**: Verified Email input form field renders correctly (`step_3_login`). When entering email and clicking continue, OTP input screen successfully appears.
- **Google Sign-In**: SDK button loads and renders in the Login modal (`step_3_login`).
- **Protected Routes**: Navigating to `/dashboard` while unauthenticated successfully redirects the user back to the `/login` route (`step_9_dashboard`).

---

## 3. Booking and Checkout Flow
- **Checkout Initialization**: Verified `/checkout/[bookingId]` page loads dynamically when booking is initialized.
- **Mock Checkout**: Razorpay SDK modal triggers. Complete checkout flow operates in Sandbox mode.
- **Booking Confirmation**: On payment success, users are redirected to the confirmation screen with dynamic seat assignments and booking reference identifiers.

---

## 4. Admin Portal
- **Admin Login**: Admin login panel loads successfully on port 3002 (`step_10_admin_login_retry`).
- **Events & Coupon Management**: Checked dashboard routes for `/events/new`, `/ticket-profiles`, and `/coupons`. All layouts are aligned and responsive.

---

## 5. Summary Verdict
**PASS**: All critical user journeys (Navigation, Auth redirect, 404 handling, and public listing views) execute without functional regressions.
