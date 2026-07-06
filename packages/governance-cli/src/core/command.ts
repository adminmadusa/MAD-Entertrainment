import { ExitCode } from '../config/schema';
import { ExecutionContext } from './context';

export interface OutputModel {
  type: string;
  success: boolean;
  exitCode: ExitCode;
  data?: any;
}

export interface CommandMetadata {
  id: string;
  name: string;
  category: 'productivity' | 'release' | 'validation' | 'core';
  description: string;
  examples: string[];
  aliases: string[];
  supportsDryRun: boolean;
  requiresWorkspace: boolean;
  requiresGit: boolean;
  requiresCleanTree: boolean;
}

export abstract class Command {
  abstract readonly metadata: CommandMetadata;
  abstract execute(context: ExecutionContext, args: string[]): Promise<OutputModel>;
}

export class CommandRegistry {
  private commands = new Map<string, Command>();
  private aliasMap = new Map<string, string>();

  register(command: Command): void {
    const meta = command.metadata;
    if (this.commands.has(meta.id)) {
      throw new Error(`Duplicate command ID registered: ${meta.id}`);
    }
    this.commands.set(meta.id, command);

    // Register primary name as trigger
    this.commands.set(meta.name, command);

    // Register aliases
    for (const alias of meta.aliases) {
      if (this.aliasMap.has(alias)) {
        throw new Error(`Duplicate alias registered: ${alias}`);
      }
      this.aliasMap.set(alias, meta.name);
    }
  }

  get(nameOrAlias: string): Command | undefined {
    const primaryName = this.aliasMap.get(nameOrAlias) ?? nameOrAlias;
    return this.commands.get(primaryName);
  }

  getAllUnique(): Command[] {
    const uniques = new Set<Command>(this.commands.values());
    return Array.from(uniques);
  }
}
