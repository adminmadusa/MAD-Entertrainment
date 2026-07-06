import { Renderer } from './Renderer';
import { OutputModel } from '../core/command';

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
    } else {
      console.log(`[CONSOLE] Result: ${model.success ? 'Success' : 'Failed'}`);
      if (model.data) {
        console.log(JSON.stringify(model.data, null, 2));
      }
    }
  }
}
