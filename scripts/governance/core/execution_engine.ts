// scripts/governance/core/execution_engine.ts
import { RuleRegistry } from '../rules/registry';
import { ValidatorRegistry, ValidatorDefinition } from './validator_registry';
import { ExecutionPlanner } from './execution_planner';
import { ExecutionScheduler, ExecutionReport } from './execution_scheduler';

// Import all standard validators
import { MarkdownValidator } from '../validators/markdown_validator';
import { LinkValidator } from '../validators/link_validator';
import { MermaidValidator } from '../validators/mermaid_validator';
import { CrossReferenceValidator } from '../validators/cross_reference_validator';
import { DocumentationValidator } from '../validators/documentation_validator';
import { SsotValidator } from '../validators/ssot_validator';
import { AdrValidator } from '../validators/adr_validator';
import { RepositoryHealthValidator } from '../validators/repository_health_validator';
import { UIDesignValidator } from '../validators/ui_design_validator';
import { AccessibilityValidator } from '../validators/accessibility_validator';
import { SharedComponentValidator } from '../validators/shared_component_validator';
import { DeadAssetDuplicateValidator } from '../validators/dead_asset_duplicate_validator';
import { SecurityValidator } from '../validators/security_validator';
import { PerformanceValidator } from '../validators/performance_validator';
import { ArchitectureValidator } from '../validators/architecture_validator';
import { RepositoryHygieneValidator } from '../validators/repository_hygiene_validator';
import { CircularImportValidator } from '../validators/circular_import_validator';
import { DeepImportValidator } from '../validators/deep_import_validator';
import { BarrelFileValidator } from '../validators/barrel_file_validator';
import { TodoInventoryValidator } from '../validators/todo_inventory_validator';

export class ExecutionEngine {
  private static initialized = false;

  public static initialize(prohibitDuplicatePriorities = false) {
    if (this.initialized) return;

    // 1. Initialize rules registry (which validates all metadata/documentation)
    RuleRegistry.initialize();

    // 2. Initialize validator registry
    ValidatorRegistry.initialize();

    // 3. Register standard validators with their exact metadata definitions
    ValidatorRegistry.registerValidator(new MarkdownValidator(), {
      id: 'MarkdownValidator',
      supportedRules: ['Malformed ATX Heading', 'Duplicate Heading', 'Unclosed Fenced Code Block', 'Malformed Table Column Count'],
      supportedFileTypes: ['.md'],
      priority: 10,
    });

    ValidatorRegistry.registerValidator(new LinkValidator(), {
      id: 'LinkValidator',
      supportedRules: ['Broken Reference Link', 'Broken Link Target', 'Broken Link Anchor'],
      supportedFileTypes: ['.md'],
      priority: 20,
    });

    ValidatorRegistry.registerValidator(new MermaidValidator(), {
      id: 'MermaidValidator',
      supportedRules: ['Unclosed Mermaid Block', 'Empty Mermaid Block', 'Invalid Mermaid Diagram Type', 'Malformed Mermaid Quotes', 'Malformed Mermaid Enclosure', 'Invalid Mermaid Flowchart Connection'],
      supportedFileTypes: ['.md'],
      priority: 25,
    });

    ValidatorRegistry.registerValidator(new CrossReferenceValidator(), {
      id: 'CrossReferenceValidator',
      supportedRules: ['Circular Document Dependency', 'Missing SSOT Reference'],
      supportedFileTypes: ['.md'],
      priority: 30,
    });

    ValidatorRegistry.registerValidator(new DocumentationValidator(), {
      id: 'DocumentationValidator',
      supportedRules: ['VAL-DOC-001', 'VAL-DOC-002', 'VAL-DOC-003', 'VAL-DOC-004', 'VAL-DOC-005', 'VAL-DOC-006', 'VAL-DOC-007', 'VAL-DOC-008'],
      supportedFileTypes: ['.md'],
      priority: 40,
    });

    ValidatorRegistry.registerValidator(new SsotValidator(), {
      id: 'SsotValidator',
      supportedRules: ['Missing SSOT Document', 'Missing SSOT Owner', 'Invalid SSOT Date Format', 'Missing SSOT Date', 'Missing SSOT Metadata Field', 'Missing SSOT Metadata', 'Missing Required Section', 'Duplicate Governance Policy'],
      supportedFileTypes: ['.md'],
      priority: 40,
    });

    ValidatorRegistry.registerValidator(new AdrValidator(), {
      id: 'AdrValidator',
      supportedRules: [
        'Missing Decisions Directory', 'Read Directory Error', 'Invalid ADR Naming', 'Malformed H1 Title',
        'Missing H1 Heading', 'Missing ADR Status', 'Invalid ADR Lifecycle Status', 'Missing ADR Date',
        'Invalid ADR Date Format', 'Missing ADR Authors', 'Missing ADR Related Documents', 'Missing ADR Metadata',
        'Missing Template Heading', 'Duplicate ADR Number', 'ADR Number Gap', 'Missing ADR Index',
        'Missing Index Entry', 'Index Title Mismatch', 'Index Status Mismatch', 'Orphan Index Entry'
      ],
      supportedFileTypes: ['.md'],
      priority: 45,
    });

    ValidatorRegistry.registerValidator(new RepositoryHealthValidator(), {
      id: 'RepositoryHealthValidator',
      supportedRules: ['Missing Document Owner', 'SSOT Owner Inconsistency', 'Missing Review Date', 'Invalid Metadata Date Format', 'Outdated Documentation', 'Orphaned Documentation'],
      supportedFileTypes: ['.md'],
      priority: 50,
    });

    ValidatorRegistry.registerValidator(new UIDesignValidator(), {
      id: 'UIDesignValidator',
      supportedRules: ['VAL-UI-007', 'VAL-UI-008', 'AST-PARSE-WARNING'],
      supportedFileTypes: ['.ts', '.tsx', '.js', '.jsx'],
      priority: 60,
    });

    ValidatorRegistry.registerValidator(new AccessibilityValidator(), {
      id: 'AccessibilityValidator',
      supportedRules: ['VAL-UI-002', 'VAL-UI-003', 'VAL-UI-009'],
      supportedFileTypes: ['.ts', '.tsx', '.js', '.jsx'],
      priority: 60,
    });

    ValidatorRegistry.registerValidator(new SharedComponentValidator(), {
      id: 'SharedComponentValidator',
      supportedRules: ['VAL-UI-004', 'VAL-UI-005', 'VAL-UI-006', 'VAL-UI-010'],
      supportedFileTypes: ['.ts', '.tsx', '.js', '.jsx'],
      priority: 60,
    });

    ValidatorRegistry.registerValidator(new DeadAssetDuplicateValidator(), {
      id: 'DeadAssetDuplicateValidator',
      supportedRules: ['VAL-UI-011', 'VAL-UI-012', 'VAL-UI-013', 'VAL-UI-014', 'VAL-UI-015', 'VAL-UI-016', 'VAL-UI-017', 'VAL-UI-018', 'VAL-UI-019'],
      supportedFileTypes: ['*'],
      priority: 70,
    });

    ValidatorRegistry.registerValidator(new SecurityValidator(), {
      id: 'SecurityValidator',
      supportedRules: ['VAL-SEC-001', 'VAL-SEC-002'],
      supportedFileTypes: ['.ts'],
      priority: 80,
    });

    ValidatorRegistry.registerValidator(new PerformanceValidator(), {
      id: 'PerformanceValidator',
      supportedRules: ['VAL-PFM-001', 'VAL-PFM-002'],
      supportedFileTypes: ['.tsx', '.ts'],
      priority: 85,
    });

    ValidatorRegistry.registerValidator(new ArchitectureValidator(), {
      id: 'ArchitectureValidator',
      supportedRules: ['VAL-ARC-001', 'VAL-ARC-002', 'VAL-ARC-003', 'VAL-ARC-004'],
      supportedFileTypes: ['.ts', '.tsx'],
      priority: 90,
    });

    ValidatorRegistry.registerValidator(new RepositoryHygieneValidator(), {
      id: 'RepositoryHygieneValidator',
      supportedRules: ['VAL-HYG-001', 'VAL-HYG-002', 'VAL-HYG-003', 'VAL-HYG-004', 'VAL-HYG-005', 'VAL-HYG-006'],
      supportedFileTypes: ['.ts', '.tsx', '.js', '.jsx', '.md'],
      priority: 95,
    });

    // GOV-003 — Repository Governance Audit Enforcement
    ValidatorRegistry.registerValidator(new CircularImportValidator(), {
      id: 'CircularImportValidator',
      supportedRules: ['VAL-ARC-005', 'VAL-ARC-005b'],
      supportedFileTypes: ['.ts', '.tsx'],
      priority: 91,
    });

    ValidatorRegistry.registerValidator(new DeepImportValidator(), {
      id: 'DeepImportValidator',
      supportedRules: ['VAL-ARC-006'],
      supportedFileTypes: ['.ts', '.tsx'],
      priority: 92,
    });

    ValidatorRegistry.registerValidator(new BarrelFileValidator(), {
      id: 'BarrelFileValidator',
      supportedRules: ['VAL-ARC-007'],
      supportedFileTypes: ['.ts', '.tsx'],
      priority: 93,
    });

    ValidatorRegistry.registerValidator(new TodoInventoryValidator(), {
      id: 'TodoInventoryValidator',
      supportedRules: ['VAL-HYG-007'],
      supportedFileTypes: ['.ts', '.tsx', '.js', '.jsx'],
      priority: 96,
    });

    // 4. Validate Registry
    ValidatorRegistry.validateRegistry();

    // 5. Prohibit duplicate priorities if specified
    if (prohibitDuplicatePriorities) {
      const priorities = new Set<number>();
      for (const val of ValidatorRegistry.getAllValidators()) {
        if (priorities.has(val.priority)) {
          throw new Error(`Validator Registry Validation Error: Duplicate priority level "${val.priority}" detected on validator "${val.id}"`);
        }
        priorities.add(val.priority);
      }
    }

    this.initialized = true;
  }

  public static async execute(
    files: string[],
    metadata: any,
    filters?: {
      rules?: string[];
      categories?: string[];
      validators?: string[];
      owners?: string[];
      severities?: string[];
      enabledOnly?: boolean;
    },
    prohibitDuplicatePriorities = false
  ): Promise<ExecutionReport> {
    // 1. Enforce initialization and startup validation
    this.initialize(prohibitDuplicatePriorities);

    // 2. Planning phase
    const plan = ExecutionPlanner.plan(filters);

    // 3. Scheduling phase (deterministic execution)
    const report = await ExecutionScheduler.execute(plan.orderedValidators, files, metadata);

    return report;
  }

  public static reset() {
    this.initialized = false;
    ValidatorRegistry.reset();
  }
}
export { ExecutionReport };
