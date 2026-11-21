import { OutputModel } from '../types/output';

export interface Renderer {
  render<T extends OutputModel>(model: T): Promise<void>;
}
