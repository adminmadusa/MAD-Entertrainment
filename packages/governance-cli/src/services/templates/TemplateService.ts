import { FileSystemService } from '../FileSystemService';

export class TemplateService {
  constructor(private fs: FileSystemService) {}

  async render(templatePath: string, variables: Record<string, string>): Promise<string> {
    const exists = await this.fs.exists(templatePath);
    if (!exists) {
      throw new Error(`Template not found at: ${templatePath}`);
    }
    let content = await this.fs.read(templatePath);
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }
    return content;
  }
}
