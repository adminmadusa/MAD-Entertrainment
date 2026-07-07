import { OutputModel } from '../core/command';

export interface Renderer {
  render<T extends OutputModel>(model: T): Promise<void>;
}
