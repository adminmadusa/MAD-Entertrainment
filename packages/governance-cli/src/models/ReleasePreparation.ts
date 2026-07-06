export interface ReleasePreparation {
  version: string;
  currentVersion: string;
  changelog: string;
  changedPackages: string[];
  tagsToCreate: string[];
  commits: string[];
  warnings: string[];
}
