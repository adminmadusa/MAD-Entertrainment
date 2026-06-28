export class FormatterEngine {
  format(code: string): string {
    // Normalizes line endings and whitespace
    return code.trim().replace(/\r\n/g, '\n') + '\n';
  }
}
