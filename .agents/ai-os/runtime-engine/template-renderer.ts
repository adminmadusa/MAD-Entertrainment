import { TemplateError } from './errors';

export class TemplateRenderer {
  async render(templateContent: string, data: Record<string, any>, format: 'markdown' | 'json'): Promise<string> {
    if (format === 'json') {
      try {
        return JSON.stringify({ template: templateContent, data }, null, 2);
      } catch (err: any) {
        throw new TemplateError(`Failed to serialize JSON report: ${err.message}`);
      }
    }

    if (format === 'markdown') {
      let output = templateContent;
      for (const [key, val] of Object.entries(data)) {
        const replacement = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
        output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), replacement);
      }
      return output;
    }

    throw new TemplateError(`Unsupported output rendering format: ${format}`);
  }
}
