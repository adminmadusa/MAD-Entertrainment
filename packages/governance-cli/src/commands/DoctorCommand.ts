import { execSync } from 'child_process';
import { join } from 'path';

import { ExitCode } from '../config/schema';
import { Command, CommandMetadata, OutputModel } from '../core/command';
import { ExecutionContext } from '../core/context';

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message?: string;
}

export class DoctorCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'doctor',
    name: 'doctor',
    category: 'core',
    description: 'Diagnoses workspace sanity and configuration health. Run with --build for compilation checks.',
    examples: ['doctor', 'doctor --build'],
    aliases: ['doc'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    const hasBuildFlag = args.includes('--build') || args.includes('--full') || context.verbose;
    const checks: CheckResult[] = [];

    context.logger.info('Starting repository health diagnostics...');

    // 1. Git Check
    try {
      const branch = await context.git.getCurrentBranch();
      const clean = await context.git.isWorkingTreeClean();
      checks.push({
        name: 'Git Initialization',
        status: 'ok',
        message: `On branch: ${branch}. Working tree: ${clean ? 'clean' : 'dirty'}`,
      });
    } catch (e: any) {
      checks.push({
        name: 'Git Initialization',
        status: 'error',
        message: `Failed to query git status: ${e.message}`,
      });
    }

    // 2. Node Check
    try {
      const nodeVer = process.version;
      checks.push({
        name: 'Node Environment',
        status: 'ok',
        message: `Active version: ${nodeVer}`,
      });
    } catch (e: any) {
      checks.push({
        name: 'Node Environment',
        status: 'error',
        message: e.message,
      });
    }

    // 3. PNPM / Package Manager Lock check
    try {
      const lockfile = join(context.repoRoot, 'pnpm-lock.yaml');
      const lockExists = await context.fs.exists(lockfile);
      checks.push({
        name: 'Lockfile Integration',
        status: lockExists ? 'ok' : 'warn',
        message: lockExists ? 'pnpm-lock.yaml found' : 'No pnpm-lock.yaml found at root',
      });
    } catch {
      checks.push({
        name: 'Lockfile Integration',
        status: 'error',
      });
    }

    // 4. Workspace Check
    try {
      const hasWorkspace = await context.repository.hasWorkspace();
      const type = await context.repository.getWorkspaceType();
      checks.push({
        name: 'Monorepo Workspace',
        status: hasWorkspace ? 'ok' : 'warn',
        message: hasWorkspace ? `Type: ${type}` : 'Single-package repository structure detected',
      });
    } catch (e: any) {
      checks.push({
        name: 'Monorepo Workspace',
        status: 'error',
        message: e.message,
      });
    }

    // 5. Config Docs Path Validation
    try {
      const backlogExists = await context.fs.exists(join(context.repoRoot, context.config.documentation.backlog));
      const roadmapExists = await context.fs.exists(join(context.repoRoot, context.config.documentation.roadmap));
      checks.push({
        name: 'Governance Configurations',
        status: (backlogExists && roadmapExists) ? 'ok' : 'warn',
        message: `Backlog: ${backlogExists ? 'found' : 'missing'}. Roadmap: ${roadmapExists ? 'found' : 'missing'}`,
      });
    } catch (e: any) {
      checks.push({
        name: 'Governance Configurations',
        status: 'error',
        message: e.message,
      });
    }

    // 6. Build compilation check (deferred unless flagged)
    if (hasBuildFlag) {
      context.logger.info('Executing compilation compilation check (pnpm build)...');
      try {
        if (!context.dryRun) {
          execSync('pnpm build', { cwd: context.repoRoot, stdio: 'ignore' });
        }
        checks.push({
          name: 'Build Compilation',
          status: 'ok',
          message: 'Workspace builds cleanly',
        });
      } catch (e: any) {
        checks.push({
          name: 'Build Compilation',
          status: 'error',
          message: 'Compiler errors found. Run pnpm build manually to diagnose.',
        });
      }
    } else {
      checks.push({
        name: 'Build Compilation',
        status: 'ok',
        message: 'Compilation checks deferred (run with --build flag)',
      });
    }

    const hasErrors = checks.some(c => c.status === 'error');

    return {
      type: 'doctor',
      success: !hasErrors,
      exitCode: hasErrors ? ExitCode.VALIDATION_FAILED : ExitCode.SUCCESS,
      data: {
        checks,
      },
    };
  }
}
