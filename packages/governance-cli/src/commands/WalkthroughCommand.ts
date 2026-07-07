import { join } from 'path';

import { ExitCode } from '../config/schema';
import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';

export class WalkthroughCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'walkthrough',
    name: 'walkthrough',
    category: 'productivity',
    description: 'Generates a draft walkthrough document based on changed files on the current branch.',
    examples: ['walkthrough'],
    aliases: ['generate-walkthrough'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: true,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const defaultBranch = context.config.repository.defaultBranch;
    const branchName = await context.git.getCurrentBranch();

    context.logger.info(`Analyzing changes against base branch: ${defaultBranch}`);
    const files = await context.git.getChangedFiles(defaultBranch);

    if (files.length === 0) {
      context.logger.warn('No changed files detected. Walkthrough generation skipped.');
      return {
        type: 'walkthrough',
        success: true,
        exitCode: ExitCode.SUCCESS,
        data: {
          filesChanged: [],
          outputFilePath: '',
        },
      };
    }

    // Try loading template from docs first, then fallback to built-in template
    const templatePath = join(context.repoRoot, 'docs/governance/templates/v1/walkthrough.md');
    let templateContent = '';
    const exists = await context.fs.exists(templatePath);
    if (exists) {
      templateContent = await context.fs.read(templatePath);
    } else {
      // Packaged template fallback
      templateContent = `---
id: walkthrough-template
version: 1
output: markdown
---
# Walkthrough: {{TITLE}}

## Changed Files
{{FILES}}

## Verification Logs
- [ ] Build compiled successfully (\`pnpm build\`)
- [ ] Tests run successfully (\`pnpm test\`)
`;
    }

    // Format files list
    const fileListMd = files.map(f => `- [${f}](file://${join(context.repoRoot, f)})`).join('\n');
    
    // Replace variables
    let body = templateContent
      .replace(/---[\s\S]*?---/, '') // Remove YAML frontmatter block
      .trim();

    body = body
      .replace(/{{TITLE}}/g, branchName)
      .replace(/{{FILES}}/g, fileListMd)
      .replace(/{{VERIFICATION_LOGS}}/g, '- [ ] All verification logs completed');

    const fileName = `walkthrough-${branchName.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
    const outputPath = join(context.repoRoot, context.config.documentation.walkthroughs, fileName);

    context.logger.info(`Writing walkthrough to ${outputPath}`);
    if (!context.dryRun) {
      await context.fs.write(outputPath, body);

      // Also generate json result
      const jsonOutputPath = outputPath.replace(/\.md$/, '.json');
      const jsonContent = JSON.stringify({
        branch: branchName,
        files,
        generatedAt: new Date().toISOString(),
      }, null, 2);
      await context.fs.write(jsonOutputPath, jsonContent);
    }

    return {
      type: 'walkthrough',
      success: true,
      exitCode: ExitCode.SUCCESS,
      data: {
        filesChanged: files,
        outputFilePath: outputPath,
      },
    };
  }
}
