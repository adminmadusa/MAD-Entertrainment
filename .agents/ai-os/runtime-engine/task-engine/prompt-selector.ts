import { TaskContext } from './types';

export class PromptSelector {
  selectPrompt(context: TaskContext): string {
    return context.prompt;
  }
}
export const promptSelector = new PromptSelector();
