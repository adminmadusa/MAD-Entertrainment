import { EventCategory } from '@mad/shared';

export interface TargetingRules {
  eventIds?: string[];
  categories?: EventCategory[];
  pages?: string[];
}

export function validateTargetingRules(rules: TargetingRules): boolean {
  if (rules.eventIds && !Array.isArray(rules.eventIds)) return false;
  if (rules.categories && !Array.isArray(rules.categories)) return false;
  if (rules.pages && !Array.isArray(rules.pages)) return false;
  return true;
}
