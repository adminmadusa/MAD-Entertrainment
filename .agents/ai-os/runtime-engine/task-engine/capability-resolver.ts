export interface Capability {
  id: string;
  type: 'validator' | 'skill' | 'prompt' | 'template';
  description: string;
}

export class CapabilityResolver {
  private capabilities: Capability[] = [
    { id: 'VAL-NAM-001', type: 'validator', description: 'Checks folder naming bans' },
    { id: 'VAL-TS-001', type: 'validator', description: 'Checks any type overrides' },
    { id: 'VAL-ARC-001', type: 'validator', description: 'Checks package boundaries imports' },
    { id: 'VAL-DOC-001', type: 'validator', description: 'Checks markdown relative links' },
    { id: 'VAL-PRF-001', type: 'validator', description: 'Checks Math.random usage' },
    { id: 'VAL-SEC-001', type: 'validator', description: 'Checks payment environment blocks' },
    { id: 'naming-audit', type: 'skill', description: 'Runs repository naming validation audit' },
    { id: 'typescript-audit', type: 'skill', description: 'Runs typescript standards audit' },
    { id: 'performance-audit', type: 'skill', description: 'Runs performance reviews' },
    { id: 'PRM-AUD-001', type: 'prompt', description: 'Audit prompt template' },
    { id: 'TMP-AUD-001', type: 'template', description: 'Audit report markdown template' }
  ];

  resolveCapabilities(type: Capability['type'], tags: string[]): string[] {
    const candidates = this.capabilities.filter(c => c.type === type);
    // Find best matches based on description/ID tags
    const matched = candidates.filter(c =>
      tags.some(tag => c.id.toLowerCase().includes(tag) || c.description.toLowerCase().includes(tag))
    );

    if (matched.length === 0) {
      // Return defaults
      return candidates.slice(0, 2).map(c => c.id);
    }

    return matched.map(c => c.id);
  }

  getCapabilities(): Capability[] {
    return this.capabilities;
  }
}
export const capabilityResolver = new CapabilityResolver();
