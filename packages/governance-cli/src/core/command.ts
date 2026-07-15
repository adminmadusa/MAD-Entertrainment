import { ExitCode } from '../config/schema';
import { ExecutionContext } from './context';

export interface OutputModel<T = unknown> {
  type: string;
  success: boolean;
  exitCode: ExitCode;
  data?: T;
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
  private nameMap = new Map<string, string>();
  private aliasMap = new Map<string, string>();

  register(command: Command): void {
    const meta = command.metadata;
    if (this.commands.has(meta.id)) {
      throw new Error(`Duplicate command ID registered: ${meta.id}`);
    }
    if (this.nameMap.has(meta.name)) {
      throw new Error(`Duplicate command name registered: ${meta.name}`);
    }

    this.commands.set(meta.id, command);
    this.nameMap.set(meta.name, meta.id);

    // Register aliases
    for (const alias of meta.aliases) {
      if (this.aliasMap.has(alias) || this.nameMap.has(alias)) {
        throw new Error(`Duplicate alias or name registered: ${alias}`);
      }
      this.aliasMap.set(alias, meta.id);
    }
  }

  get(nameOrAlias: string): Command | undefined {
    const targetId = this.nameMap.get(nameOrAlias) ?? this.aliasMap.get(nameOrAlias) ?? nameOrAlias;
    return this.commands.get(targetId);
  }

  getAllUnique(): Command[] {
    return Array.from(this.commands.values());
  }
}
