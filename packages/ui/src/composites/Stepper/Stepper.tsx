import React from 'react';

export interface StepperProps {
  steps: string[];
  currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center relative z-10 group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isCurrent ? 'bg-primary/20 text-primary border-2 border-primary' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-surface-elevated text-text-muted border border-border' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`absolute top-10 text-xs font-medium whitespace-nowrap transition-colors duration-200
                    ${isCurrent ? 'text-text' : 'text-text-muted'}
                    ${isCompleted ? 'text-primary' : ''}
                  `}
                >
                  {step}
                </span>
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-px mx-4 relative top-[-10px] z-0">
                  <div className="absolute inset-0 bg-border" />
                  <div
                    className="absolute inset-0 bg-primary transition-all duration-300"
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="h-6" /> {/* Spacer for the absolute positioned text */}
    </div>
  );
};
