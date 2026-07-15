import { Renderer } from '../renderers/Renderer';
import { Command } from './command';

export interface PluginBuilder {
  registerCommand(command: Command): void;
  registerRenderer(renderer: Renderer): void;
}

export interface GovernancePlugin {
  id: string;
  name: string;
  version: string;
  register(builder: PluginBuilder): void;
}
