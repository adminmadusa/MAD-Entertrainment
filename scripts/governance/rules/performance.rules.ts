// scripts/governance/rules/performance.rules.ts
import { RuleDefinition } from '../core/types';

export const performanceRules: RuleDefinition[] = [
  {
    id: 'VAL-PFM-001',
    name: 'Optimize Font Loading',
    category: 'PERFORMANCE',
    severity: 'WARNING',
    confidence: 1.0,
    defaultLifecycle: 'NEW',
    ciPolicy: 'WARN',
    owner: 'Platform Team',
    version: '1.0.0',
    documentationLink: 'AGENTS.md#code-quality-rules',
  },
  {
    id: 'VAL-PFM-002',
    name: 'Avoid Render-Blocking Imports',
    category: 'PERFORMANCE',
    severity: 'WARNING',
    confidence: 0.95,
    defaultLifecycle: 'NEW',
    ciPolicy: 'WARN',
    owner: 'Platform Team',
    version: '1.0.0',
    documentationLink: 'AGENTS.md#code-quality-rules',
  },
];
