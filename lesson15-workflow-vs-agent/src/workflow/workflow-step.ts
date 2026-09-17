import type { WorkflowStepDefinition } from '../types/workflow.js';

import { WorkflowContext } from './workflow-context.js';

export class WorkflowStep implements WorkflowStepDefinition<WorkflowContext> {
  constructor(
    readonly name: string,
    readonly description: string,
    private readonly handler: (context: WorkflowContext) => Promise<void>,
  ) {}

  async execute(context: WorkflowContext): Promise<void> {
    await this.handler(context);
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }
}
