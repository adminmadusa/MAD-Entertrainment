# AI Task Execution Engine

The Task Execution Engine is the primary intelligence entry point of the AI Operating System. It maps natural language requests to intent models, resolves capability contexts, builds deterministic execution plan graphs, and schedules pipeline execution.

## Execution Lifecycle

```
Natural Language Request
           ↓
    Intent Detection
           ↓
  Capability Resolution
           ↓
    Execution Graph (DAG)
           ↓
     Execution Plan
           ↓
      Orchestrator
     ↙            ↘
  Success       Failure
     ↓            ↓
  Report       Recovery
                  ↓
                Report
```

## Public API Stability

The Task Engine exposes exactly two stable public APIs:

```ts
planTask(
  repoRoot: string,
  taskId: string,
  request: string,
  mode: ExecutionMode
): Promise<ExecutionPlan>;

executeTask(
  plan: ExecutionPlan,
  filesList: string[]
): Promise<TaskExecutionResult>;
```
