import { Renderer } from './Renderer';
import { OutputModel } from '../core/command';

export class ConsoleRenderer implements Renderer {
  async render<T extends OutputModel>(model: T): Promise<void> {
    if (model.type === 'help') {
      const { commands } = model.data;
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
      console.log(`🛡️  Governance CLI Version: ${model.data.version}`);
    } else {
      console.log(`[CONSOLE] Result: ${model.success ? 'Success' : 'Failed'}`);
      if (model.data) {
        console.log(JSON.stringify(model.data, null, 2));
      }
    }
  }
}
