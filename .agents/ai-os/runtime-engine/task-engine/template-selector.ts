import { TaskContext } from './types';

export class TemplateSelector {
  selectTemplate(context: TaskContext): string {
    return context.template;
  }
}
export const templateSelector = new TemplateSelector();
