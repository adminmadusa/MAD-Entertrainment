import { EventCategory } from "@mad/shared";

import { FormSection } from "@/components/forms/primitives";
import { COUPON_CATEGORY_LABELS } from "@/components/forms/CouponForm/constants/coupon-form.constants";
import { AdminEvent } from "@/lib/api/admin/event.service";
import { CouponFormValues } from "@/types/coupon-form";

interface CouponEligibilitySectionProps {
  values: CouponFormValues;
  events: AdminEvent[];
  isLoadingEvents: boolean;
  onToggleCategory: (category: EventCategory) => void;
  onToggleEvent: (eventId: string) => void;
}

export function CouponEligibilitySection({
  values,
  events,
  isLoadingEvents,
  onToggleCategory,
  onToggleEvent,
}: CouponEligibilitySectionProps) {
  return (
    <FormSection title="Targeting Filters (Optional)">
      <p className="text-text-muted text-xs -mt-3">
        Leave unselected to make the coupon applicable system-wide
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-text-secondary text-sm font-semibold mb-2 block">
            Applicable Event Categories
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(COUPON_CATEGORY_LABELS).map(([key, label]) => {
              const category = key as EventCategory;
              const isSelected = values.applicableCategories.includes(category);
              return (
                <button
                  type="button"
                  key={category}
                  onClick={() => onToggleCategory(category)}
                  className={`px-3 py-2 text-xs rounded-xl border font-medium text-left transition-all ${
                    isSelected
                      ? "bg-accent-purple/10 border-accent-purple text-white"
                      : "bg-white/2 border-white/5 text-text-muted hover:border-white/10 hover:text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-text-secondary text-sm font-semibold mb-2 block">
            Applicable Specific Events
          </label>
          {isLoadingEvents ? (
            <div className="text-xs text-text-muted animate-pulse">
              Loading events list...
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-border-subtle bg-white/2 rounded-xl p-3 space-y-2 custom-scrollbar">
              {events.map((event) => {
                const isSelected = values.applicableEventIds.includes(
                  event._id,
                );
                return (
                  <div
                    key={event._id}
                    onClick={() => onToggleEvent(event._id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "bg-accent-purple/10 text-white"
                        : "hover:bg-white/5 text-text-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-3.5 h-3.5 accent-accent-purple rounded"
                    />
                    <span className="text-xs font-medium">{event.title}</span>
                  </div>
                );
              })}
              {events.length === 0 && (
                <div className="text-xs text-text-muted text-center py-4">
                  No events found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </FormSection>
  );
}
