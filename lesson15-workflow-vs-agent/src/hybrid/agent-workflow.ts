import type { WorkflowDefinition } from '../types/workflow.js';

import { WorkflowContext } from '../workflow/workflow-context.js';

import { WorkflowEngine } from '../workflow/workflow-engine.js';

export class AgentWorkflowCoordinator {
  constructor(private readonly workflowEngine: WorkflowEngine) {}

  async executeWorkflow(
    workflow: WorkflowDefinition<WorkflowContext>,

    userInput: string,

    initialData: Record<string, unknown>,
  ): Promise<WorkflowContext> {
    const context = new WorkflowContext(userInput);

    for (const [key, value] of Object.entries(initialData)) {
      context.set(key, value);
    }

    await this.workflowEngine.execute(workflow, context);

    return context;
  }
}
