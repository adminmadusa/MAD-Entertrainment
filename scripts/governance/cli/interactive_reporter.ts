// scripts/governance/cli/interactive_reporter.ts
import { createInterface, Interface } from 'readline';

import type { SafetyLevel } from '../core/fix_types';

// ---------------------------------------------------------------------------
// Public types (consumed by InteractiveApprovalPolicy)
// ---------------------------------------------------------------------------

/** A single fix entry eligible for approval. */
export interface FixEntry {
  ruleId: string;
  filePath: string;
  safety: SafetyLevel;
  message: string;
}

/** A grouped set of entries by safety level, for the pre-prompt summary. */
export interface FixGroup {
  safety: SafetyLevel;
  entries: FixEntry[];
}

/** Approval choices returned for SAFE fixers. */
export type SafeChoice = 'y' | 'n' | 'a' | 's' | 'q';

/** Approval choices returned for MANUAL fixers. */
export type ManualChoice = 'y' | 'n';

// ---------------------------------------------------------------------------
// InteractionProvider interface
// ---------------------------------------------------------------------------

/**
 * Abstraction over the interactive UI layer.
 * Implementations: ConsoleInteractionProvider (TTY), future CIInteractionProvider,
 * IDEInteractionProvider (JSON IPC).
 *
 * All methods are pure UI — no file I/O, no lifecycle, no finding mutations.
 */
export interface InteractionProvider {
  /** Show grouped summary before the prompt loop starts. */
  showSummary(groups: FixGroup[], total: number): void;
  /** Prompt for a SAFE fix. Returns y/n/a/s/q. */
  promptFix(entry: FixEntry, index: number, total: number): Promise<SafeChoice>;
  /** Prompt for a MANUAL fix. Returns y/n only — never auto-approves. */
  promptManualFix(entry: FixEntry, index: number, total: number): Promise<ManualChoice>;
  /** Render an in-place progress bar. */
  renderProgress(current: number, total: number): void;
  /** Final session summary. */
  showSessionSummary(approved: number, skipped: number, cancelled: boolean): void;
  /** Release any held resources (close readline, flush stdout). */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// ConsoleInteractionProvider
// ---------------------------------------------------------------------------

const DIVIDER = '─'.repeat(50);

/**
 * Terminal-based implementation of InteractionProvider.
 * Uses Node.js built-in `readline` — no third-party dependencies.
 * Uses emoji + plain text formatting consistent with the rest of the governance CLI.
 */
export class ConsoleInteractionProvider implements InteractionProvider {
  private rl: Interface;

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
  }

  public showSummary(groups: FixGroup[], total: number): void {
    console.log(`\n${DIVIDER}`);
    console.log(`📋  Governance Interactive Fix Session`);
    console.log(DIVIDER);
    console.log(`Found ${total} applicable fix${total !== 1 ? 'es' : ''}\n`);

    for (const group of groups) {
      if (group.entries.length === 0) continue;
      const icon = group.safety === 'SAFE' ? '✅' : '⚠️ ';
      console.log(`${icon} ${group.safety} (${group.entries.length})`);
      console.log('─'.repeat(25));

      // Aggregate by ruleId with file count
      const byRule = new Map<string, string[]>();
      for (const e of group.entries) {
        const files = byRule.get(e.ruleId) ?? [];
        files.push(e.filePath);
        byRule.set(e.ruleId, files);
      }
      for (const [ruleId, files] of byRule) {
        console.log(`  ${ruleId.padEnd(18)} (${files.length})`);
      }
      console.log('');
    }
    console.log(DIVIDER);
  }

  public async promptFix(
    entry: FixEntry,
    index: number,
    total: number
  ): Promise<SafeChoice> {
    console.log(`\n[${index}/${total}] ${entry.ruleId}`);
    console.log(`       File:    ${entry.filePath}`);
    console.log(`       Safety:  ${entry.safety}`);
    console.log(`       Message: ${entry.message}`);
    console.log('');

    const answer = await this.prompt('Apply this fix? [y/n/a/s/q]: ');
    const normalised = answer.trim().toLowerCase();

    if (['y', 'n', 'a', 's', 'q'].includes(normalised)) {
      return normalised as SafeChoice;
    }

    // Invalid input — re-prompt
    console.log('  Please enter y (yes), n (no), a (all remaining SAFE), s (skip remaining), or q (quit).');
    return this.promptFix(entry, index, total);
  }

  public async promptManualFix(
    entry: FixEntry,
    index: number,
    total: number
  ): Promise<ManualChoice> {
    console.log(`\n[${index}/${total}] ${entry.ruleId}`);
    console.log(`       File:    ${entry.filePath}`);
    console.log(`       Safety:  MANUAL`);
    console.log(`       Message: ${entry.message}`);
    console.log('');
    console.log('⚠️   MANUAL fix requires explicit confirmation on every occurrence.');

    const answer = await this.prompt('Proceed? [y/n]: ');
    const normalised = answer.trim().toLowerCase();

    if (normalised === 'y' || normalised === 'n') {
      return normalised as ManualChoice;
    }

    console.log('  Please enter y (yes) or n (no).');
    return this.promptManualFix(entry, index, total);
  }

  public renderProgress(current: number, total: number): void {
    const BAR_WIDTH = 20;
    const filled = Math.round((current / total) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    process.stdout.write(`\rApplying... [${bar}]  ${current} / ${total}  `);
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  public showSessionSummary(
    approved: number,
    skipped: number,
    cancelled: boolean
  ): void {
    console.log(`\n${DIVIDER}`);
    if (cancelled) {
      console.log('🚫  Interactive session cancelled.');
    } else {
      console.log('📊  Interactive Session Summary');
      console.log(DIVIDER);
      console.log(`Approved:   ${approved}`);
      console.log(`Skipped:    ${skipped}`);
    }
    console.log(DIVIDER);
  }

  public dispose(): void {
    this.rl.close();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private prompt(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, answer => resolve(answer));
    });
  }
}
