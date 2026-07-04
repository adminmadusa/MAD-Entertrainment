export class ImportManager {
  sortImports(code: string): string {
    const lines = code.split('\n');
    const importLines = lines.filter(line => line.trim().startsWith('import ')).sort();
    const otherLines = lines.filter(line => !line.trim().startsWith('import '));
    return [...importLines, ...otherLines].join('\n');
  }
}
