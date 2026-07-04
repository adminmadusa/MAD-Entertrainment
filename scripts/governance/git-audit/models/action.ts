export interface ActionItem {
  branchName: string;
  verification: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
  action: string;
  risk: 'Low' | 'Medium' | 'High' | 'N/A';
  status: 'Execute Now' | 'Pending' | 'Blocked';
  confidence: string; // e.g., "99%", "0%"
  evidence: string[];
  reason: string;
  preconditions: string[];
  rollbackStrategy: string;
  estimatedEffort: string;
  shellCommand: string;
}

export type LifecycleState =
  | 'Protected'
  | 'Active Development'
  | 'Open PR'
  | 'Integration'
  | 'Patch Equivalent'
  | 'Duplicate Candidate'
  | 'Experimental'
  | 'Archived'
  | 'Stale'
  | 'Ready For Delete'
  | 'Blocked';
