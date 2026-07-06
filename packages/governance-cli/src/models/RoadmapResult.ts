export interface RoadmapPhase {
  id: string;
  name: string;
  status: 'planned' | 'current' | 'complete';
  description: string;
}

export interface RoadmapResult {
  phases: RoadmapPhase[];
}
