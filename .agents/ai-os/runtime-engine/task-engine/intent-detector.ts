import { IntentDefinition, IntentResult } from './types';
import { IntentDetectionError } from './errors';

export class IntentDetector {
  private registry: IntentDefinition[] = [
    {
      intent: 'audit',
      keywords: ['audit', 'check', 'validate', 'verify', 'scan'],
      defaultMode: 'VALIDATE',
      requiredCapabilities: ['VAL-NAM-001', 'VAL-TS-001']
    },
    {
      intent: 'bugfix',
      keywords: ['fix', 'resolve', 'patch', 'repair', 'clean'],
      defaultMode: 'FIX',
      requiredCapabilities: ['VAL-NAM-001', 'VAL-TS-001']
    },
    {
      intent: 'implementation',
      keywords: ['implement', 'create', 'add', 'build', 'new'],
      defaultMode: 'IMPLEMENT',
      requiredCapabilities: ['VAL-TS-001']
    },
    {
      intent: 'planning',
      keywords: ['plan', 'design', 'blueprint', 'architecture'],
      defaultMode: 'PLAN',
      requiredCapabilities: ['VAL-ARC-001']
    },
    {
      intent: 'documentation',
      keywords: ['document', 'write', 'readme', 'markdown'],
      defaultMode: 'REPORT',
      requiredCapabilities: ['VAL-DOC-001']
    },
    {
      intent: 'review',
      keywords: ['review', 'inspect', 'audit-only'],
      defaultMode: 'ANALYZE',
      requiredCapabilities: ['VAL-NAM-001']
    }
  ];

  registerPluginIntent(definition: IntentDefinition) {
    if (this.registry.some(d => d.intent === definition.intent)) {
      throw new IntentDetectionError(`Intent "${definition.intent}" already registered.`);
    }
    this.registry.push(definition);
  }

  detectIntent(request: string): IntentResult {
    const reqLower = request.toLowerCase();
    const scores: Array<{ intent: string; confidence: number; matched: string[] }> = [];

    for (const def of this.registry) {
      const matched = def.keywords.filter(keyword => reqLower.includes(keyword));
      if (matched.length > 0) {
        const confidence = Math.min(matched.length / def.keywords.length + 0.5, 0.99);
        scores.push({ intent: def.intent, confidence, matched });
      }
    }

    if (scores.length === 0) {
      // Return default audit intent
      return {
        intent: 'audit',
        confidence: 0.5,
        matchedKeywords: [],
        alternatives: []
      };
    }

    // Sort by confidence desc
    scores.sort((a, b) => b.confidence - a.confidence);

    const primary = scores[0];
    const alternatives = scores.slice(1).map(s => ({
      intent: s.intent,
      confidence: s.confidence
    }));

    return {
      intent: primary.intent,
      confidence: primary.confidence,
      matchedKeywords: primary.matched,
      alternatives
    };
  }

  getIntentDefinition(intent: string): IntentDefinition | null {
    return this.registry.find(d => d.intent === intent) || null;
  }
}
export const intentDetector = new IntentDetector();
