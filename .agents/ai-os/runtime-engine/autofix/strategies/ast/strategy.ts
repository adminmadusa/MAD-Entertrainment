export class AstFixStrategy {
  replaceNode(content: string, start: number, end: number, replacement: string): string {
    return content.substring(0, start) + replacement + content.substring(end);
  }
}
