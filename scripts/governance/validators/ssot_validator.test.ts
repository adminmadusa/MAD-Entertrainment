// scripts/governance/validators/ssot_validator.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import { SsotValidator } from './ssot_validator';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const OWNER_MAP: Record<string, string[]> = {
  'README.md': ['Documentation Owner'],
  'REPOSITORY_GOVERNANCE.md': ['Repository Governance Owner', 'Repository Governance Owner & Maintainers'],
  'ARCHITECTURE.md': ['Architecture Owner', 'Repository Architecture'],
  'DEPLOYMENT_MAP.md': ['Platform/Deployment Owner', 'DevOps & Platform Engineering', 'Platform Owner'],
  'API_CONTRACTS.md': ['API Owner', 'Repository Architecture & API Governance'],
  'docs/decisions/README.md': ['Architecture Review Board', 'Repository Architecture'],
  'RUNBOOK.md': ['Platform/Deployment Owner', 'DevOps & Platform Engineering'],
  'AGENTS.MD': ['Repository Governance Owner', 'Repository Governance Owner & Maintainers'],
  'CHANGELOG.md': ['Repository Governance Owner & Maintainers', 'Repository Governance Owner', 'Documentation Owner'],
  'TESTING.md': ['QA Owner', 'Repository Governance Owner', 'Platform/Deployment Owner']
};

const REQUIRED_SECTIONS: Record<string, string[][]> = {
  'README.md': [
    ['Overview', 'Project Overview'],
    ['Developer Workflow', 'Getting Started']
  ],
  'REPOSITORY_GOVERNANCE.md': [
    ['Governance Principles', 'Governance Policy', 'Governance Compliance Matrix', 'Subsystem Governance Rules'],
    ['Repository Lifecycle', 'Documentation Lifecycle', 'Branch & PR Governance'],
    ['Change Management', 'Repository Change & Deprecation Policy']
  ],
  'ARCHITECTURE.md': [
    ['System Overview', 'Executive Overview', 'Overview'],
    ['Package Structure', 'Monorepo Topology', 'Package Responsibilities'],
    ['Design Principles', 'Coding Standards']
  ],
  'DEPLOYMENT_MAP.md': [
    ['Environment Matrix'],
    ['Deployment Flow', 'CI/CD Pipeline', 'Git Branch Strategy & Promotion']
  ],
  'API_CONTRACTS.md': [
    ['API Inventory', 'API Inventory & Routes'],
    ['Lifecycle Policy', 'Versioning & Lifecycle']
  ],
  'CHANGELOG.md': [
    ['Version History'],
    ['Release Policy', 'Changelog Policy']
  ],
  'RUNBOOK.md': [
    ['Incident Response'],
    ['Operational Procedures', 'First-Time Staging Deployment', 'Database Backup & Restore', 'Health Check & Monitoring', 'Environment Checklist']
  ],
  'TESTING.md': [
    ['Testing Strategy', 'Purpose', 'Core Verification Commands'],
    ['Verification Requirements']
  ],
  'AGENTS.MD': [
    ['Responsibilities', 'Applies To', 'PURPOSE', 'Relationship to Repository Governance Policy'],
    ['Workflow', 'IMPLEMENTATION WORKFLOW']
  ]
};

describe('SsotValidator', () => {
  const validator = new SsotValidator();

  it('should pass on complete and correct SSOT documents', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      const fullPath = typeof path === 'string' ? path : '';
      // Sort keys descending by length to ensure docs/decisions/README.md matches before README.md
      const keys = Object.keys(OWNER_MAP).sort((a, b) => b.length - a.length);
      const matchKey = keys.find(k => fullPath.endsWith(k)) || 'README.md';

      const owner = OWNER_MAP[matchKey][0];
      const sections = REQUIRED_SECTIONS[matchKey] || [];
      const sectionStrings = sections.map(s => `## ${s[0]}`).join('\n');

      return `
# Title
- **Status**: Active
- **Owner**: ${owner}
- **Version**: 1.0
- **Review Cycle**: Annual
- **Last Updated**: 2026-07-03

${sectionStrings}
`;
    });

    const result = await validator.run([], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result.errors.length).toBe(0);
  });

  it('should detect missing SSOT documents', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await validator.run([], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Missing SSOT Document')).toBe(true);
  });

  it('should detect missing document owners', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
# Title
- **Status**: Active
- **Version**: 1.0
- **Review Cycle**: Annual
- **Last Updated**: 2026-07-03
`);

    const result = await validator.run([], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Missing SSOT Owner')).toBe(true);
  });
});
