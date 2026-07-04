import { FixResultItem } from './fix_types';

export class FixResult {
  public readonly items: FixResultItem[] = [];
  public startTime = Date.now();
  public endTime = Date.now();

  public addResult(item: FixResultItem) {
    this.items.push(item);
  }

  public get elapsedMs(): number {
    return this.endTime - this.startTime;
  }

  public get stats() {
    let applied = 0;
    let skipped = 0;
    let unsupported = 0;
    let errors = 0;
    const modifiedFiles = new Set<string>();

    for (const item of this.items) {
      if (item.success) {
        if (item.applied) {
          applied++;
          modifiedFiles.add(item.filePath);
        } else {
          skipped++;
        }
      } else {
        if (item.safety === 'UNSUPPORTED') {
          unsupported++;
        } else {
          errors++;
        }
      }
    }

    return {
      applied,
      skipped,
      unsupported,
      errors,
      modifiedFilesCount: modifiedFiles.size,
      modifiedFiles: Array.from(modifiedFiles),
    };
  }
}
