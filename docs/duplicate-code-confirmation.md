# Duplicate Code Confirmation

This document confirms all duplicate authentication code blocks identified across the MAD Entertainment codebase.

---

## 1. Google SDK Initialization & Rendering
* **Duplicate Block**: Google Identity Services (`gsi`) script loading, OAuth client configuration, initialization call, and button rendering logic.
* **Locations**:
  * [apps/web/src/app/(auth)/login/page.tsx:L161-185](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/app/(auth)/login/page.tsx#L161-L185)
  * [apps/web/src/components/booking/CheckoutAuthCard.tsx:L141-166](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/CheckoutAuthCard.tsx#L141-L166)
* **Why Duplicate**: Both components require a functional Google sign-in button. Because they were developed as separate standalone features (the Login page and the Checkout modal container), the developer copy-pasted the entire initialization logic, including configurations, callbacks, and element selectors.
* **Recommended Consolidation**: Extract GSI loading, script initialization, and global initialization guard tracking into a unified React hook (e.g., `useGoogleSignIn`) inside a new file `apps/web/src/hooks/use-google-signin.ts`. Share a global browser property `window.__googleSdkInitialized` to guarantee `google.accounts.id.initialize` is called exactly once.
* **Risk**: **LOW** (Safe component-level encapsulation change).

---

## 2. OTP Passcode Resend Timer
* **Duplicate Block**: Interval-based countdown state and resend timers for OTP passcode limits.
* **Locations**:
  * [apps/web/src/app/(auth)/login/page.tsx:L64-94](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/app/(auth)/login/page.tsx#L64-L94)
  * [apps/web/src/components/booking/CheckoutAuthCard.tsx:L58-80](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/CheckoutAuthCard.tsx#L58-L80)
* **Why Duplicate**: Both components feature a passcode entry screen with a standard 60-second "Resend Code" countdown timer. They both set up independent `setInterval` intervals on mount/demount using identical callback logic.
* **Recommended Consolidation**: Extract resend timer countdown logic into a custom hook `useCountdownTimer` inside `apps/web/src/hooks/use-countdown-timer.ts`.
* **Risk**: **LOW** (Refactoring UI state logic only).

---

## 3. Email/OTP Login & Google Login Mutations
* **Duplicate Block**: TanStack Query mutations (`requestMagicLinkMutation`, `verifyMutation`, `googleLoginMutation`) and corresponding submit handlers.
* **Locations**:
  * [apps/web/src/app/(auth)/login/page.tsx:L96-143](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/app/(auth)/login/page.tsx#L96-L143)
  * [apps/web/src/components/booking/CheckoutAuthCard.tsx:L82-131](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/CheckoutAuthCard.tsx#L82-L131)
* **Why Duplicate**: Both components perform the exact same authentication actions (requesting a magic link/OTP, verifying an OTP code, and logging in with a Google token).
* **Recommended Consolidation**: Extract these shared mutations into a consolidated custom hook `useAuthFlow` in `apps/web/src/hooks/use-auth-flow.ts`.
* **Risk**: **LOW** (Encapsulates React Query mutations without altering endpoints).

---

## 4. HttpOnly Cookie Setting Options
* **Duplicate Block**: Secure cookie serialization settings.
* **Locations**:
  * [apps/server/src/controllers/public/auth.controller.ts:L58-63](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/server/src/controllers/public/auth.controller.ts#L58-L63) (inside `verifyMagicLinkOrOTP`)
  * [apps/server/src/controllers/public/auth.controller.ts:L92-97](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/server/src/controllers/public/auth.controller.ts#L92-L97) (inside `loginWithGoogle`)
  * [apps/server/src/controllers/public/auth.controller.ts:L126-131](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/server/src/controllers/public/auth.controller.ts#L126-L131) (inside `refresh`)
* **Why Duplicate**: The developer manually set the same cookie options (`httpOnly`, `secure`, `sameSite`, `maxAge`) across three distinct route handlers on the backend.
* **Recommended Consolidation**: Create a utility function `setSessionCookie(res: Response, token: string)` in a helper module (e.g., `apps/server/src/utils/cookie.ts`) to centralize cookie parameters and enforce configuration consistency in production.
* **Risk**: **LOW** (Improves backend code quality, guarantees cookie parity).
