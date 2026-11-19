// scripts/governance/validators/helpers/code_quality_classifier.ts
import { governanceConfig } from "../../core/governance.config";

export interface FileClassification {
  ruleId: string;
  category: string;
  limit: number;
  label: string;
}

type ThresholdKey =
  keyof (typeof governanceConfig)["codeQuality"]["thresholds"];

interface ClassificationRule {
  match: (path: string) => boolean;
  ruleId: string;
  category: string;
  key: ThresholdKey;
  label: string;
}

const RULES: ClassificationRule[] = [
  // 1. Test Files
  {
    match: (p) => /\.(test|spec)\.(ts|tsx)$/.test(p),
    ruleId: "VAL-QUAL-006",
    category: "testing",
    key: "testMaxLines",
    label: "Test Suite",
  },
  // 2. Custom Hooks
  {
    match: (p) =>
      /(^|\/)use[A-Z0-9].*\.(ts|tsx)$/.test(p) || p.includes("/hooks/"),
    ruleId: "VAL-QUAL-002",
    category: "hooks",
    key: "hookMaxLines",
    label: "Custom Hook",
  },
  // 3. Controllers
  {
    match: (p) => p.includes("/controllers/") || p.endsWith(".controller.ts"),
    ruleId: "VAL-QUAL-003",
    category: "controllers",
    key: "controllerMaxLines",
    label: "Controller",
  },
  // 4. Services & Workers
  {
    match: (p) =>
      p.includes("/services/") ||
      p.endsWith(".service.ts") ||
      p.includes("/workers/") ||
      p.endsWith(".worker.ts"),
    ruleId: "VAL-QUAL-004",
    category: "services",
    key: "serviceMaxLines",
    label: "Backend Service / Worker",
  },
  // 5. Schemas & Type definitions
  {
    match: (p) =>
      p.includes("/models/") ||
      p.endsWith(".schema.ts") ||
      p === "packages/types/src/index.ts",
    ruleId: "VAL-QUAL-005",
    category: "schemas",
    key: "schemaMaxLines",
    label: "Schema / Type Definitions",
  },
  // 6. UI Components & Pages
  {
    match: (p) =>
      p.endsWith(".tsx") &&
      (p.includes("/components/") ||
        p.includes("/app/") ||
        p.startsWith("packages/ui/")),
    ruleId: "VAL-QUAL-001",
    category: "components",
    key: "componentMaxLines",
    label: "UI Component / Page",
  },
];

export function classifyCodeFile(
  normPath: string,
  thresholds: (typeof governanceConfig)["codeQuality"]["thresholds"],
): FileClassification | null {
  for (const rule of RULES) {
    if (rule.match(normPath)) {
      return {
        ruleId: rule.ruleId,
        category: rule.category,
        limit: thresholds[rule.key],
        label: rule.label,
      };
    }
  }
  return null;
}
