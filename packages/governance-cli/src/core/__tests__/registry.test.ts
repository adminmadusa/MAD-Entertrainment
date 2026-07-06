import { describe, it, expect } from 'vitest';
import { CommandRegistry, Command, CommandMetadata, OutputModel } from '../command';
import { ExecutionContext } from '../context';
import { ExitCode } from '../../config/schema';

class DummyCommand extends Command {
  readonly metadata: CommandMetadata = {
    id: 'dummy',
    name: 'dummy',
    category: 'core',
    description: 'A mock command for testing.',
    examples: [],
    aliases: ['dum', 'mock-dum'],
    supportsDryRun: true,
    requiresWorkspace: false,
    requiresGit: false,
    requiresCleanTree: false,
  };

  async execute(context: ExecutionContext, args: string[]): Promise<OutputModel> {
    return {
      type: 'dummy',
      success: true,
      exitCode: ExitCode.SUCCESS,
    };
  }
}

describe('CommandRegistry', () => {
  it('should register and retrieve commands by name and alias', () => {
    const registry = new CommandRegistry();
    const cmd = new DummyCommand();
    registry.register(cmd);

    expect(registry.get('dummy')).toBe(cmd);
    expect(registry.get('dum')).toBe(cmd);
    expect(registry.get('mock-dum')).toBe(cmd);
    expect(registry.getAllUnique()).toContain(cmd);
    expect(registry.getAllUnique().length).toBe(1);
  });

  it('should fail on duplicate registrations', () => {
    const registry = new CommandRegistry();
    const cmd1 = new DummyCommand();
    const cmd2 = new DummyCommand();

    registry.register(cmd1);
    expect(() => registry.register(cmd2)).toThrow();
  });
});
