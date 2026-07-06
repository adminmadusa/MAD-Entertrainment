export interface ReleaseResult {
  version: string;
  success: boolean;
  tagsCreated: string[];
  bumpedPackages: string[];
}
