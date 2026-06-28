import { IntentResult, TaskContext, ExecutionMode } from './types';
import { capabilityResolver } from './capability-resolver';

export class ContextResolver {
  resolveContext(
    repoRoot: string,
    taskId: string,
    request: string,
    intent: IntentResult,
    mode?: ExecutionMode
  ): TaskContext {
    const tags = [intent.intent, intent.intent === 'audit' ? 'naming' : intent.intent];
    const detectedValidators = capabilityResolver.resolveCapabilities('validator', tags);
    const detectedSkills = capabilityResolver.resolveCapabilities('skill', tags);
    const prompts = capabilityResolver.resolveCapabilities('prompt', tags);
    const templates = capabilityResolver.resolveCapabilities('template', tags);

    const context: TaskContext = {
      repoRoot,
      taskId,
      request,
      mode: mode || 'VALIDATE',
      selectedValidators: detectedValidators,
      selectedSkills: detectedSkills,
      selectedPrompts: prompts,
      selectedTemplates: templates
    };

    return Object.freeze(context);
  }
}
export const contextResolver = new ContextResolver();
