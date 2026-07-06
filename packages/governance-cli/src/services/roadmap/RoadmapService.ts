import { FileSystemService } from '../FileSystemService';
import { RoadmapPhase } from '../../models/RoadmapResult';
import { join } from 'path';

export class RoadmapService {
  constructor(
    private fs: FileSystemService,
    private repoRoot: string,
    private configRoadmapPath: string
  ) {}

  async loadRoadmap(): Promise<RoadmapPhase[]> {
    const roadmapPath = join(this.repoRoot, this.configRoadmapPath.replace(/\.md$/, '.json'));
    const exists = await this.fs.exists(roadmapPath);
    if (exists) {
      try {
        const content = await this.fs.read(roadmapPath);
        const data = JSON.parse(content);
        if (Array.isArray(data.phases)) {
          return data.phases;
        }
      } catch {}
    }

    // Default roadmap mapping fallback (Phase 1 to 4)
    return [
      { id: '1', name: 'Design System Foundation', status: 'complete', description: 'Shared design tokens & contracts.' },
      { id: '2A', name: 'UI Infrastructure', status: 'complete', description: 'Stable package exports.' },
      { id: '2B', name: 'Shared Components', status: 'complete', description: '22 shared primitives.' },
      { id: '2.5', name: 'Adoption & Freeze', status: 'complete', description: 'Shim removals & v1.4 tag freeze.' },
      { id: '3', name: 'UX Pattern Library', status: 'complete', description: '19 pattern documents & journey maps.' },
      { id: '3.6A', name: 'Governance CLI Core', status: 'complete', description: 'CLI framework platform setup.' },
      { id: '3.6B', name: 'Productivity Commands', status: 'complete', description: 'doctor, status, cleanup, walkthrough, pr.' },
      { id: '3.6C', name: 'Release Automation', status: 'current', description: 'release, roadmap, changelog, baselines.' },
      { id: '3.7', name: 'UI/UX Remediation', status: 'planned', description: 'Remediating active form action components.' },
      { id: '4', name: 'Governance Enforcement', status: 'planned', description: 'AST validators and CI linting gates.' },
    ];
  }
}
