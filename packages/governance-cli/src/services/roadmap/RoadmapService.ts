import { join } from 'path';

import { RoadmapPhase } from '../../models/RoadmapResult';
import { FileSystemService } from '../FileSystemService';

export class RoadmapService {
  constructor(
    private fs: FileSystemService,
    private repoRoot: string,
    private configRoadmapPath: string
  ) {}

  async loadRoadmap(): Promise<RoadmapPhase[]> {
    const roadmapPath = join(this.repoRoot, this.configRoadmapPath);
    const exists = await this.fs.exists(roadmapPath);
    if (!exists) {
      throw new Error(`Roadmap database file not found at: ${roadmapPath}. Create a roadmap.json file to map milestones.`);
    }
    
    try {
      const content = await this.fs.read(roadmapPath);
      const data = JSON.parse(content);
      if (Array.isArray(data.phases)) {
        return data.phases;
      }
      throw new Error(`Roadmap database format is invalid: ${roadmapPath}. Expecting a list of "phases" objects.`);
    } catch (e: any) {
      throw new Error(`Failed to parse roadmap milestones config: ${e.message}`);
    }
  }
}
