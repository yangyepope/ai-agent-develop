import type { Plan } from '../types/plan.js';

import type { ExecutionContext, StepExecution } from '../types/execution.js';

import { StepExecutor } from './step-executor.js';

export class Executor {
  private readonly stepExecutor: StepExecutor;

  constructor(stepExecutor: StepExecutor = new StepExecutor()) {
    this.stepExecutor = stepExecutor;
  }

  async executeStep(
    step: Plan['steps'][number],
    context: ExecutionContext,
  ): Promise<StepExecution> {
    const previousResults = this.getDependencyResults(step.dependencies, context);

    const execution: StepExecution = {
      step,

      status: 'running',

      attempts: 0,
    };

    context.executions.push(execution);

    try {
      execution.attempts++;

      const result = await this.stepExecutor.execute(step, previousResults);

      execution.status = 'completed';

      execution.result = result;

      return execution;
    } catch (error) {
      execution.status = 'failed';

      execution.error = error instanceof Error ? error.message : String(error);

      return execution;
    }
  }

  async retryStep(execution: StepExecution, context: ExecutionContext): Promise<StepExecution> {
    const previousResults = this.getDependencyResults(execution.step.dependencies, context);

    try {
      execution.status = 'running';

      execution.attempts++;

      execution.error = undefined;

      const result = await this.stepExecutor.execute(execution.step, previousResults);

      execution.status = 'completed';

      execution.result = result;

      return execution;
    } catch (error) {
      execution.status = 'failed';

      execution.error = error instanceof Error ? error.message : String(error);

      return execution;
    }
  }

  private getDependencyResults(dependencies: number[], context: ExecutionContext): string[] {
    return dependencies.map((dependencyId) => {
      const execution = context.executions.find(
        (item) => item.step.id === dependencyId && item.status === 'completed',
      );

      if (!execution) {
        throw new Error(`Step ${dependencyId} 的执行结果不存在`);
      }

      if (!execution.result) {
        throw new Error(`Step ${dependencyId} 没有结果`);
      }

      return execution.result;
    });
  }
}
