// scripts/governance/core/constants.ts

export const OWNERSHIP_WEIGHT = 0.4;
export const FRESHNESS_WEIGHT = 0.4;
export const LINKAGE_WEIGHT = 0.2;

export const REVIEW_CYCLE_DURATIONS: Record<string, number> = {
  Quarterly: 90, // in days
  "Bi-annual": 180, // in days
};
