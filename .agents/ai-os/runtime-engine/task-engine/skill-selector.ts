import { TaskContext } from './types';

export class SkillSelector {
  selectSkills(context: TaskContext): string[] {
    return context.skills;
  }
}
export const skillSelector = new SkillSelector();
