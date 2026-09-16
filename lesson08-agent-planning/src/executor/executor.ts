import type { Plan } from '../types/plan.js';

import type { ExecutionContext, StepExecution } from '../types/execution.js';

import { StepExecutor } from './step-executor.js';

export class Executor {
  private readonly stepExecutor: StepExecutor;

  constructor(stepExecutor: StepExecutor = new StepExecutor()) {
    this.stepExecutor = stepExecutor;
  }

  async execute(plan: Plan): Promise<ExecutionContext> {
    const context: ExecutionContext = {
      goal: plan.goal,

      executions: [],
    };

    for (const step of plan.steps) {
      console.log(`\n▶ 开始执行 Step ${step.id}: ${step.title}`);

      const execution: StepExecution = {
        step,
        status: 'running',
      };

      context.executions.push(execution);

      try {
        const previousResults = this.getDependencyResults(step.dependencies, context);

        const result = await this.stepExecutor.execute(step, previousResults);

        execution.status = 'completed';

        execution.result = result;

        console.log(`✓ Step ${step.id} 执行完成`);
      } catch (error) {
        execution.status = 'failed';

        execution.error = error instanceof Error ? error.message : String(error);

        console.error(`✗ Step ${step.id} 执行失败`);

        throw error;
      }
    }

    return context;
  }

  private getDependencyResults(dependencies: number[], context: ExecutionContext): string[] {
    return dependencies.map((dependencyId) => {
      const execution = context.executions.find((item) => item.step.id === dependencyId);

      if (!execution) {
        throw new Error(`找不到依赖 Step ${dependencyId}`);
      }

      if (execution.status !== 'completed') {
        throw new Error(`Step ${dependencyId} 尚未完成`);
      }

      if (!execution.result) {
        throw new Error(`Step ${dependencyId} 没有执行结果`);
      }

      return execution.result;
    });
  }
}
