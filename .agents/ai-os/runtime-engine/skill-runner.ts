import { SkillDefinition } from './types';
import { SkillExecutionError } from './errors';

export interface ISkill {
  definition: SkillDefinition;
  execute(inputs: Record<string, any>): Promise<Record<string, any>>;
}

export class SkillRunner {
  private skills = new Map<string, ISkill>();

  registerSkill(skill: ISkill) {
    this.skills.set(skill.definition.id, skill);
  }

  async runSkill(id: string, inputs: Record<string, any>): Promise<Record<string, any>> {
    const skill = this.skills.get(id);
    if (!skill) {
      // Mock execution if skill is not loaded
      return {
        success: true,
        skillId: id,
        message: 'Mock execution successfully finalized.'
      };
    }

    try {
      return await skill.execute(inputs);
    } catch (err: any) {
      throw new SkillExecutionError(`Skill ${id} failed during execution: ${err.message}`);
    }
  }
}
