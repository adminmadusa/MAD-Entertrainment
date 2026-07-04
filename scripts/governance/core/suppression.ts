// scripts/governance/core/suppression.ts

import { RuleRegistry } from '../rules/registry';

export interface SuppressionResult {
  isSuppressed: boolean;
  justification?: string;
  failedAttempt?: boolean;
  restricted?: boolean;
}

export function checkSuppression(
  lines: string[],
  lineIndex: number,
  ruleId: string
): SuppressionResult {
  const linesToCheck = [lineIndex - 1, lineIndex];
  let hasIgnoreKeyword = false;

  for (const idx of linesToCheck) {
    if (idx >= 0 && idx < lines.length) {
      const lineText = lines[idx];
      const lowerText = lineText.toLowerCase();

      if (lowerText.includes('governance-ignore') && lowerText.includes(ruleId.toLowerCase())) {
        hasIgnoreKeyword = true;
      }
    }
  }

  if (hasIgnoreKeyword) {
    const rule = RuleRegistry.getRule(ruleId);
    const severity = rule?.severity;
    const isHighRisk = severity === 'CRITICAL' || severity === 'HIGH' || severity === 'ERROR';

    if (isHighRisk) {
      return { isSuppressed: false, restricted: true };
    }

    for (const idx of linesToCheck) {
      if (idx >= 0 && idx < lines.length) {
        const lineText = lines[idx];
        const lowerText = lineText.toLowerCase();

        if (lowerText.includes('governance-ignore') && lowerText.includes(ruleId.toLowerCase())) {
          // Check same line for justification (e.g., // governance-ignore VAL-UI-007: justification)
          const ruleIndex = lineText.indexOf(ruleId);
          if (ruleIndex !== -1) {
            const restOfLine = lineText.substring(ruleIndex + ruleId.length).trim();
            const cleanRest = restOfLine.replace(/^[:\-\s\/\*]+/, '').replace(/[\*\/]+$/, '').trim();
            if (cleanRest.length > 5) {
              return { isSuppressed: true, justification: cleanRest };
            }
          }

          // Check next line for Reason/justification
          if (idx + 1 < lines.length) {
            const nextLineText = lines[idx + 1];
            const reasonMatch = nextLineText.match(/(?:reason|justification)\s*:\s*(.+)/i);
            if (reasonMatch && reasonMatch[1].trim().length > 5) {
              return {
                isSuppressed: true,
                justification: reasonMatch[1].trim().replace(/[\*\/]+$/, '').trim()
              };
            }
          }
        }
      }
    }

    return { isSuppressed: false, failedAttempt: true };
  }

  return { isSuppressed: false };
}
