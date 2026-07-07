export class RegexFixStrategy {
  replacePattern(content: string, pattern: RegExp, replacement: string): string {
    return content.replace(pattern, replacement);
  }
}
