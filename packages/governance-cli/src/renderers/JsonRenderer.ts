import { Renderer } from './Renderer';
import { OutputModel } from '../core/command';

export class JsonRenderer implements Renderer {
  async render<T extends OutputModel>(model: T): Promise<void> {
    console.log(JSON.stringify(model, null, 2));
  }
}
