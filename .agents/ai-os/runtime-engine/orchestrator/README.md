# Registry Discovery & AI Orchestration Engine

The Orchestration Engine automates registry discovery, topologically maps module dependency graphs, plan task flows, and executes scheduled pipelines sequentially with retry policies and metrics collection.

## Execution Example

```ts
import { OrchestrationEngine } from './engine';

const orchestrator = new OrchestrationEngine();

const { success, metrics, results } = await orchestrator.runOrchestration(
  process.cwd(),
  ['apps/web/temp2/test.tsx'],
  'TASK-999',
  'typescript',
  true
);

console.log(metrics.executionTimeMs);
```
