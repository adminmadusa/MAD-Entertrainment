import { Command } from './command';
import { Renderer } from '../renderers/Renderer';

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
