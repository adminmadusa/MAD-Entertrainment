import { OutputModel } from '../core/command';
import { Renderer } from './Renderer';

export class ConsoleRenderer implements Renderer {
  async render<T extends OutputModel>(model: T): Promise<void> {
    if (model.type === 'help') {
      const commands = (model.data as any)?.commands ?? [];
      console.log('==================================================');
      console.log('🛡️   Governance CLI Commands Help');
      console.log('==================================================');
      for (const cmd of commands) {
        console.log(`\n🔹  ${cmd.name} (ID: ${cmd.id})`);
        console.log(`    Description: ${cmd.description}`);
        console.log(`    Category:    ${cmd.category}`);
        if (cmd.aliases.length > 0) {
          console.log(`    Aliases:     ${cmd.aliases.join(', ')}`);
        }
        if (cmd.examples.length > 0) {
          console.log('    Examples:');
          for (const ex of cmd.examples) {
            console.log(`      $ governance ${ex}`);
          }
        }
      }
      console.log('\n==================================================');
    } else if (model.type === 'version') {
      console.log(`🛡️  Governance CLI Version: ${(model.data as any)?.version}`);
    } else if (model.type === 'doctor') {
      const checks = (model.data as any)?.checks ?? [];
      console.log('\n==================================================');
      console.log('📋  Governance CLI Health Diagnostics');
      console.log('==================================================');
      for (const c of checks) {
        const symbol = c.status === 'ok' ? '✓' : (c.status === 'warn' ? '⚠' : '✗');
        const colorPrefix = c.status === 'ok' ? '\x1b[32m' : (c.status === 'warn' ? '\x1b[33m' : '\x1b[31m');
        const colorSuffix = '\x1b[0m';
        console.log(`${colorPrefix}${symbol}${colorSuffix}  ${c.name.padEnd(28)} : ${c.message ?? 'Passed'}`);
      }
      console.log('==================================================\n');
    } else if (model.type === 'status') {
      const d = model.data as any;
      console.log('\n==================================================');
      console.log('🛡️   Governance CLI Dashboard Status');
      console.log('==================================================');
      console.log(`  Repository Root       : ${d.repoRoot}`);
      console.log(`  Current Branch        : ${d.branch} (${d.isClean ? 'Clean' : 'Dirty'})`);
      console.log(`  Default Branch Base   : ${d.defaultBranch}`);
      console.log(`  Node Engine Version   : ${d.nodeVersion}`);
      console.log(`  PNPM Version          : ${d.pnpmVersion}`);
      console.log(`  CLI Framework Version : ${d.governanceCliVersion}`);
      console.log(`  Pattern Specs Count   : ${d.patternsCount}`);
      console.log(`  Active Registry Gaps  : ${d.backlogCount}`);
      console.log('==================================================\n');
    } else if (model.type === 'backlog') {
      const gaps = (model.data as any)?.gaps ?? [];
      console.log('\n==================================================');
      console.log('⚠️   UX Pattern Gaps & Backlog');
      console.log('==================================================');
      if (gaps.length === 0) {
        console.log('  No backlog gaps found in registry.');
      } else {
        console.log(`  ${'ID'.padEnd(8)} | ${'Priority'.padEnd(8)} | ${'Status'.padEnd(10)} | Description`);
        console.log('  ' + '-'.repeat(80));
        for (const g of gaps) {
          console.log(`  ${g.id.padEnd(8)} | ${g.priority.padEnd(8)} | ${g.status.padEnd(10)} | ${g.title}`);
        }
      }
      console.log('==================================================\n');
    } else if (model.type === 'roadmap') {
      const phases = (model.data as any)?.phases ?? [];
      console.log('\n==================================================');
      console.log('🗺️   Governance Milestones & Roadmap');
      console.log('==================================================');
      for (const p of phases) {
        const symbol = p.status === 'complete' ? '✓' : (p.status === 'current' ? '▶' : '⚙');
        const color = p.status === 'complete' ? '\x1b[32m' : (p.status === 'current' ? '\x1b[33m' : '\x1b[90m');
        const clear = '\x1b[0m';
        console.log(`  ${color}${symbol}${clear}  Phase ${p.id.padEnd(6)} : ${p.name.padEnd(28)} [${p.status.toUpperCase()}]`);
        console.log(`                 ${p.description}`);
      }
      console.log('==================================================\n');
    } else if (model.type === 'changelog') {
      const text = (model.data as any)?.changelogText ?? '';
      console.log('\n==================================================');
      console.log('📝  Generated Semantic Release Changelog');
      console.log('==================================================');
      console.log(text);
      console.log('==================================================\n');
    } else if (model.type === 'release') {
      const d = model.data as any;
      console.log('\n==================================================');
      console.log('🚀  Governance CLI Release Pipeline');
      console.log('==================================================');
      if (d.prepared && !d.executed) {
        console.log(`  Status: Prepared (Dry-Run mode)`);
        console.log(`  Version increment: ${d.prep.currentVersion} ➔ ${d.prep.version}`);
      } else {
        console.log(`  Status: Executed Successfully`);
        console.log(`  Bumped Packages:   ${d.bumpedPackages.join(', ')}`);
        console.log(`  Created Git Tags:  ${d.tagsCreated.join(', ')}`);
      }
      console.log('==================================================\n');
    } else if (model.type === 'baseline') {
      const d = model.data as any;
      console.log('\n==================================================');
      console.log('🔍  Governance Baseline Hash Integrity');
      console.log('==================================================');
      if (d.syncedFiles.length > 0) {
        console.log(`  Status: Synchronized (${d.syncedFiles.length} file hashes updated)`);
      } else {
        console.log(`  Status: Audited`);
        console.log(`  Integrity: ${d.status === 'ok' ? 'PASSED' : 'OUT-OF-SYNC'}`);
        if (d.mismatches.length > 0) {
          console.log(`  Mismatches found:  ${d.mismatches.length} files modified`);
        }
      }
      console.log('==================================================\n');
    } else {
      console.log(`[CONSOLE] Result: ${model.success ? 'Success' : 'Failed'}`);
      if (model.data) {
        console.log(JSON.stringify(model.data, null, 2));
      }
    }
  }
}
