'use client';

import { motion } from 'framer-motion';
import React, { useImperativeHandle, forwardRef } from 'react';
import { type AdminEvent } from '@/lib/api/admin/event.service';

import { useEventFormState } from './useEventFormState';
import { EventFormWizardView } from './EventFormWizardView';
import { EventFormStackedView } from './EventFormStackedView';

export interface EventFormProps {
  initialValues?: Partial<AdminEvent>;
  activeStep?: number;
  onEditStep?: (step: number) => void;
  error?: string;
}

export interface EventFormHandle {
  validateStep: (step: number) => boolean;
  validateAll: () => boolean;
  getPayload: () => Partial<AdminEvent>;
}

export const EventForm = forwardRef<EventFormHandle, EventFormProps>(function EventForm(
  { initialValues, activeStep, onEditStep, error: propError },
  ref
) {
  const formState = useEventFormState(initialValues, propError);
  const { validateStep, validateAll, getPayload, displayError } = formState;

  // Expose Imperative Ref Handles
  useImperativeHandle(ref, () => ({
    validateStep,
    validateAll,
    getPayload,
  }));

  const isCreateWizard = activeStep !== undefined;

  return (
    <div className="space-y-6">
      {displayError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          aria-live="polite"
          className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
        >
          {displayError}
        </motion.div>
      )}

      {isCreateWizard ? (
        <EventFormWizardView
          activeStep={activeStep}
          formState={formState}
          onEditStep={onEditStep}
        />
      ) : (
        <EventFormStackedView formState={formState} />
      )}
    </div>
  );
});
