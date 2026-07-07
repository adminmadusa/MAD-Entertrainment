import { OutputModel } from '../core/command';
import { Renderer } from './Renderer';

export class MarkdownRenderer implements Renderer {
  async render<T extends OutputModel>(model: T): Promise<void> {
    console.log(`## Action Result (${model.type})`);
    console.log(`- **Status:** ${model.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`- **Exit Code:** \`${model.exitCode}\``);
    if (model.data) {
      console.log('\n### Data Details\n');
      console.log('```json');
      console.log(JSON.stringify(model.data, null, 2));
      console.log('```');
    }
  }
}
