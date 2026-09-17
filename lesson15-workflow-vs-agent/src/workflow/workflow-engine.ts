import type { WorkflowDefinition } from '../types/workflow.js';

import { WorkflowContext } from './workflow-context.js';

export class WorkflowEngine {
  async execute(
    workflow: WorkflowDefinition<WorkflowContext>,
    context: WorkflowContext,
  ): Promise<WorkflowContext> {
    console.log();
    console.log('================================');
    console.log(`Workflow: ${workflow.name}`);
    console.log('================================');

    console.log(`描述: ${workflow.description}`);

    console.log();

    for (const step of workflow.steps) {
      const startedAt = Date.now();

      console.log(`▶ 开始执行: ${step.name}`);

      console.log(` ${step.description}`);

      context.getState().steps.push({
        stepName: step.name,
        status: 'running',
        startedAt,
      });

      try {
        await step.execute(context);

        const finishedAt = Date.now();

        const execution = context
          .getState()
          .steps.find((item) => item.stepName === step.name && item.status === 'running');

        if (execution) {
          execution.status = 'success';
          execution.finishedAt = finishedAt;
        }

        console.log(`✓ 完成: ${step.name}`);

        console.log(`  耗时: ${finishedAt - startedAt}ms`);

        console.log();
      } catch (error) {
        const finishedAt = Date.now();

        const execution = context
          .getState()
          .steps.find((item) => item.stepName === step.name && item.status === 'running');

        if (execution) {
          execution.status = 'failed';
          execution.finishedAt = finishedAt;
          execution.error = error instanceof Error ? error.message : String(error);
        }

        console.error(`✗ 失败: ${step.name}`);

        throw error;
      }
    }

    return context;
  }
}
