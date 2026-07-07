export interface Patch {
  id: string;
  file: string;
  original: string;
  replacement: string;
  lineStart: number;
  lineEnd: number;
  confidence: number;
  validatorId: string;
}
