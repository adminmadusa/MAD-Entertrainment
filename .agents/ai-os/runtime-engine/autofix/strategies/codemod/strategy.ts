export class CodemodFixStrategy {
  applyTransform(content: string, transformFn: (code: string) => string): string {
    return transformFn(content);
  }
}
