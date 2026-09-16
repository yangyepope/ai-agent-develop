import type { ExecutionContext, StepExecution } from '../types/execution.js';
import  type { Plan } from '../types/plan.js';
import { StepExecutor } from './step-executor.js';

export class Executor {
  private readonly stepExecutor: StepExecutor;

  constructor(stepExecutor: StepExecutor = new StepExecutor()) {
    this.stepExecutor = stepExecutor;
  }

  async execute(plan: Plan, context: ExecutionContext): Promise<ExecutionContext> {
    for (const step of plan.steps) {
      const execution: StepExecution = {
        step,
        status: 'pending',
        attempts: 0,
      };

      context.executions.push(execution);

      const dependenciesCompleted = this.checkDependencies(step, context);

      if (!dependenciesCompleted) {
        execution.status = 'failed';
        execution.error = '依赖步骤没有完成';

        return context;
      }

      execution.status = 'running';
      execution.attempts += 1;

      try {
        const result = await this.stepExecutor.execute(step);

        execution.status = 'success';
        execution.result = result;

        console.log(`✅ ${step.id} 执行成功`);
      } catch (error) {
        execution.status = 'failed';

        execution.error = error instanceof Error ? error.message : String(error);

        console.log(`❌ ${step.id} 执行失败：${execution.error}`);

        return context;
      }
    }

    return context;
  }

  private checkDependencies(step: Plan['steps'][number], context: ExecutionContext): boolean {
    for (const dependencyId of step.dependencies) {
      const dependency = context.executions.find((execution) => execution.step.id === dependencyId);

      if (!dependency) {
        return false;
      }

      if (dependency.status !== 'success') {
        return false;
      }
    }

    return true;
  }
}
