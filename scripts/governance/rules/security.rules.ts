// scripts/governance/rules/security.rules.ts
import { RuleDefinition } from '../core/types';

export const securityRules: RuleDefinition[] = [
  {
    id: 'VAL-SEC-001',
    name: 'Secure Upload Handling',
    category: 'SECURITY',
    severity: 'CRITICAL',
    confidence: 1.0,
    defaultLifecycle: 'NEW',
    ciPolicy: 'FAIL_BUILD',
    owner: 'Security Guild',
    version: '1.0.0',
    documentationLink: 'AGENTS.md#high-risk-areas',
  },
  {
    id: 'VAL-SEC-002',
    name: 'RBAC Authorization check',
    category: 'SECURITY',
    severity: 'CRITICAL',
    confidence: 1.0,
    defaultLifecycle: 'NEW',
    ciPolicy: 'FAIL_BUILD',
    owner: 'Security Guild',
    version: '1.0.0',
    documentationLink: 'AGENTS.md#high-risk-areas',
  },
];
