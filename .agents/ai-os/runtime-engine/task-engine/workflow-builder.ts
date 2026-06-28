import { ExecutionGraph, ExecutionGraphNode } from './types';
import { DependencyResolver } from '../dependency-resolver';

export class WorkflowBuilder {
  private resolver = new DependencyResolver();

  buildWorkflow(graph: ExecutionGraph): ExecutionGraphNode[] {
    const ids = graph.nodes.map(n => n.id);
    const depsMap = graph.nodes.reduce((acc, n) => {
      acc[n.id] = [...n.dependencies];
      return acc;
    }, {} as Record<string, string[]>);

    const sortedIds = this.resolver.resolveTopologicalSort(ids, depsMap);
    return sortedIds.map(id => graph.nodes.find(n => n.id === id)!);
  }
}
export const workflowBuilder = new WorkflowBuilder();
