# AI Task Execution Engine

The Task Execution Engine is the primary intelligence entry point of the AI Operating System. It maps natural language instructions to intent models, resolves layer contexts, builds deterministic planner workflows, and schedules executable runs.

## Usage Example

```ts
import { TaskExecutionEngine } from './engine';

const engine = new TaskExecutionEngine();

const result = await engine.executeTask(
  process.cwd(),
  ['apps/web/temp2/test.tsx'],
  'TASK-111',
  'Audit authentication middleware',
  false
);

console.log(result.intent.intent); // 'audit'
```
