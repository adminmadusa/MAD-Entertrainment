import { Fixer } from './fix_types';
import { MalformedAtxHeadingFixer } from './fixers/malformed_atx_heading_fixer';
import { FilenameCasingFixer } from './fixers/filename_casing_fixer';
import { WorkstationPathFixer } from './fixers/workstation_path_fixer';
import { TrailingWhitespaceFixer } from './fixers/trailing_whitespace_fixer';
import { EofNewlineFixer } from './fixers/eof_newline_fixer';
import { BlankLineFixer } from './fixers/blank_line_fixer';
import { DuplicateImportFixer } from './fixers/duplicate_import_fixer';
import { ImportOrderFixer } from './fixers/import_order_fixer';
import { TypeImportFixer } from './fixers/type_import_fixer';

export class FixRegistry {
  private static fixers = new Map<string, Fixer>();

  public static registerDefaultFixers() {
    this.register(new MalformedAtxHeadingFixer());
    this.register(new FilenameCasingFixer());
    this.register(new WorkstationPathFixer());
    this.register(new TrailingWhitespaceFixer());
    this.register(new EofNewlineFixer());
    this.register(new BlankLineFixer());
    this.register(new DuplicateImportFixer());
    this.register(new ImportOrderFixer());
    this.register(new TypeImportFixer());
  }

  public static register(fixer: Fixer) {
    if (this.fixers.has(fixer.ruleId)) {
      throw new Error(`Duplicate fixer registration for rule: ${fixer.ruleId}`);
    }
    this.fixers.set(fixer.ruleId, fixer);
  }

  public static get(ruleId: string): Fixer | undefined {
    return this.fixers.get(ruleId);
  }

  public static getAll(): Fixer[] {
    return Array.from(this.fixers.values());
  }

  public static supports(ruleId: string): boolean {
    return this.fixers.has(ruleId);
  }

  public static registeredRuleIds(): string[] {
    return Array.from(this.fixers.keys()).sort();
  }

  public static registeredFixers(): readonly Fixer[] {
    return Array.from(this.fixers.values());
  }

  public static clear() {
    this.fixers.clear();
  }
}
