import { PromptDefinition } from './types';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

export class PromptRunner {
  async assemblePrompt(
    repoRoot: string,
    definition: PromptDefinition,
    customVariables: Record<string, string> = {}
  ): Promise<string> {
    let promptTemplate = `
# AI OS Dynamic Prompt: ${definition.id}
## Active Governance Context
[Pre-Implementation Verification Checklist]

## Active Standards & Architectural Invariants
[TypeScript Casing Rules]
[React Hydration safety checks]
`;

    // Try to load template from prompt directory if it exists
    const promptPath = join(repoRoot, '.agents', 'ai-os', 'prompts', 'audit', 'repository-audit', 'PROMPT.md');
    if (existsSync(promptPath)) {
      try {
        promptTemplate = readFileSync(promptPath, 'utf8');
      } catch {
        // Fallback to initial promptTemplate
      }
    }

    // Resolves references dynamically
    let prompt = promptTemplate;
    for (const [key, val] of Object.entries(customVariables)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }

    return prompt;
  }
}
