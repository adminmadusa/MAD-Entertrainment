'use client';

import { Coupon } from '@mad/types';
import { motion } from 'framer-motion';

import { FormActions } from '@/components/forms/primitives';
import { useCouponForm } from '@/hooks/forms/use-coupon-form';
import { AdminEvent } from '@/lib/api/admin/event.service';
import { CouponFormMode } from '@/types/coupon-form';

import { CouponDetailsSection } from './CouponDetailsSection';
import { CouponDiscountSection } from './CouponDiscountSection';
import { CouponEligibilitySection } from './CouponEligibilitySection';
import { CouponLimitsSection } from './CouponLimitsSection';
import { CouponPublishSection } from './CouponPublishSection';
import { CouponScheduleSection } from './CouponScheduleSection';

interface CouponFormProps {
  mode: CouponFormMode;
  initialCoupon?: Coupon;
  events: AdminEvent[];
  isLoadingEvents: boolean;
  isSubmitting: boolean;
  serverError: string;
  onBack: () => void;
  onSubmitPayload: Parameters<typeof useCouponForm>[0]['onSubmitPayload'];
}

export function CouponForm({
  mode,
  initialCoupon,
  events,
  isLoadingEvents,
  isSubmitting,
  serverError,
  onBack,
  onSubmitPayload,
}: CouponFormProps) {
  const { values, error, setField, toggleEventSelection, toggleCategorySelection, submit } = useCouponForm({
    mode,
    initialCoupon,
    onSubmitPayload,
  });

  const submitLabel = isSubmitting
    ? mode === 'create'
      ? 'Creating...'
      : 'Saving Changes...'
    : mode === 'create'
      ? 'Create Coupon'
      : 'Save Changes';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{mode === 'create' ? 'Create Coupon' : 'Edit Coupon'}</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {mode === 'create' ? 'Configure a new discount coupon code' : `Modify parameters for coupon ${values.code}`}
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await submit();
        }}
        className="space-y-6"
      >
        {(serverError || error) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
          >
            {serverError || error}
          </motion.div>
        )}

        <CouponDetailsSection values={values} onFieldChange={setField} />
        <CouponDiscountSection values={values} onFieldChange={setField} />
        <CouponLimitsSection values={values} onFieldChange={setField} />
        <CouponScheduleSection values={values} onFieldChange={setField} />
        <CouponEligibilitySection
          values={values}
          events={events}
          isLoadingEvents={isLoadingEvents}
          onToggleCategory={toggleCategorySelection}
          onToggleEvent={toggleEventSelection}
        />
        <CouponPublishSection values={values} onFieldChange={setField} />

        <FormActions onCancel={onBack} isSubmitting={isSubmitting} submitLabel={submitLabel} />
      </form>
    </div>
  );
}
