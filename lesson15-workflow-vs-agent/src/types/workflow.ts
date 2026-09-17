export interface WorkflowStepDefinition<TContext> {
  name: string;

  description: string;

  execute(context: TContext): Promise<void>;
}

export interface WorkflowDefinition<TContext> {
  name: string;

  description: string;

  steps: WorkflowStepDefinition<TContext>[];
}
