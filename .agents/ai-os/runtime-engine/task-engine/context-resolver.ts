import { IntentResult, TaskContext } from './types';

export class ContextResolver {
  resolveContext(intent: IntentResult): TaskContext {
    const context: TaskContext = {
      layers: ['foundation', 'repository', 'domain', 'standards'],
      validators: ['VAL-NAM-001', 'VAL-TS-001'],
      skills: ['core/naming-audit', 'core/typescript-audit'],
      prompt: 'PRM-AUD-001',
      template: 'TMP-AUD-001'
    };

    if (intent.target === 'authentication') {
      context.layers.push('architecture');
      context.validators.push('VAL-ARC-001');
      context.skills.push('core/architecture-review');
    }

    return context;
  }
}
export const contextResolver = new ContextResolver();
