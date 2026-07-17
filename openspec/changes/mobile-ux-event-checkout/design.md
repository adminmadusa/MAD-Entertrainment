# Design: Event Checkout Mobile UX Remediation

- **Change ID**: `mobile-ux-event-checkout`
- **Status**: Draft

---

## 1. Architectural Overview
This change remediates the client-side user experience during ticket selection and checkout on mobile devices. All changes are confined to the `apps/web` application components and do not affect the shared library primitives, APIs, or database models.

---

## 2. File-by-File Design Details

### 1. [TicketSummaryItem.tsx](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/shared/TicketSummaryItem.tsx)
- **Problem**: Long ticket tier names can expand the width of the row, forcing the parent flex container to stretch and triggering horizontal scrollbars on screens <375px.
- **Solution**:
  - Add text truncation classes to the tier name span: `truncate block max-w-[150px] xs:max-w-[200px] sm:max-w-none`.
  - Add `title={formatDisplayName(tierName)}` to ensure the full name is readable via native tooltips and screen readers.

### 2. [TicketSelectionContent.tsx](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/TicketSelectionContent.tsx)
- **Problem**: Quantity counter buttons (`-` and `+`) are `w-10 h-10` (40px), failing touch target guidelines.
- **Solution**:
  - Upgrade both buttons from `w-10 h-10` to `w-11 h-11` (44px) or `w-12 h-12` (48px).
  - Adjust vertical alignment and spacing in the container to maintain layout balance.

### 3. [PromoCodeForm.tsx](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/PromoCodeForm.tsx)
- **Problem**: Apply/Remove buttons and input field are `py-2.5` (~36-38px), failing the touch target minimum height of 44px.
- **Solution**:
  - Set the input field to `h-11` or `py-3` with explicit height.
  - Set Apply and Remove buttons to `h-11` or `py-3` to ensure a clean 44px touch target on mobile viewports.

### 4. [CheckoutContent.tsx](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/CheckoutContent.tsx)
- **Problem**:
  - Header Back (`←`) and Close (`✕`) buttons are `w-10 h-10` (40px).
  - Center header text can compress or overflow on 320px screens.
- **Solution**:
  - Upgrade header buttons to `w-11 h-11` (44px) or `w-12 h-12` (48px).
  - Set title text size to `text-xs md:text-sm` and timer to `text-[10px] md:text-[11px]` to ensure it fits comfortably within the narrow mobile viewport.
  - Apply `py-3.5` or `min-h-[44px]` to the Place Order button inside the mobile sticky footer.

### 5. [CheckoutForm.tsx](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/checkout/CheckoutForm.tsx)
- **Problem**:
  - Form inputs are `text-sm` (14px), causing iOS Safari/Chrome to automatically zoom in on focus, shifting the viewport layout.
  - Checkbox labels are `text-[11px]`, which is too small.
  - Checkboxes themselves are default size (16px), requiring high precision.
- **Solution**:
  - Add `text-base md:text-sm` to all form `<Input>` components.
  - Standardize labels to `text-xs` (12px) in the checkbox labels.
  - Set checkbox input sizes to `w-5 h-5` to increase clickable area.

### 6. [LeaveCheckoutModal.tsx](file:///Users/admin/Desktop/MAD%20Entertrainment/apps/web/src/components/booking/checkout/LeaveCheckoutModal.tsx)
- **Problem**: Stay and Leave buttons are `py-3` (~40px), failing target sizes.
- **Solution**:
  - Update buttons to `py-3.5` or `min-h-[44px]` for clean mobile touch boundaries.
