/**
 * AI Operating System Runtime Engine Constants
 */

export const ENGINE_STATES = {
  IDLE: 'Idle',
  BOOTING: 'Booting',
  LOADING: 'Loading',
  RESOLVING: 'Resolving',
  EXECUTING: 'Executing',
  VALIDATING: 'Validating',
  RENDERING: 'Rendering',
  REPORTING: 'Reporting',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  RECOVERING: 'Recovering'
} as const;

export type EngineState = typeof ENGINE_STATES[keyof typeof ENGINE_STATES];

export const TIER_ORDER = [
  'foundation',
  'repository',
  'domain',
  'architecture',
  'standards',
  'governance',
  'validation',
  'skills',
  'prompts',
  'templates',
  'knowledge',
  'runtime'
] as const;
