export interface ActionItem {
  branchName: string;
  verification: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
  action: string;
  risk: 'Low' | 'Medium' | 'High' | 'N/A';
  status: 'Execute Now' | 'Pending' | 'Blocked';
  reason: string;
  preconditions: string[];
  rollbackStrategy: string;
  estimatedEffort: string;
}

export type LifecycleState =
  | 'PROTECTED'
  | 'ACTIVE'
  | 'OPEN_PR'
  | 'STACK_PARENT'
  | 'STACK_CHILD'
  | 'INTEGRATION'
  | 'PATCH_EQUIVALENT'
  | 'MERGED'
  | 'DUPLICATE'
  | 'LEGACY'
  | 'ARCHIVED'
  | 'READY_FOR_DELETION'
  | 'BLOCKED'
  | 'UNKNOWN';
