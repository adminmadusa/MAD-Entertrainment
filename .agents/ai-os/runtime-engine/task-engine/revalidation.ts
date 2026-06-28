import { BaseValidatorRunner } from '../validators/base/runner';
import { ExtendedValidatorResult } from '../validators/base/result';

export class RevalidationRunner {
  private runner = new BaseValidatorRunner();

  async revalidate(
    repoRoot: string,
    filesList: string[],
    validatorsIds: string[]
  ): Promise<ExtendedValidatorResult[]> {
    return await this.runner.runValidators(validatorsIds, repoRoot, filesList);
  }
}
export const revalidationRunner = new RevalidationRunner();
