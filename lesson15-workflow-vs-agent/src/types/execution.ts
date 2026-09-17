export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed';

export interface StepExecutionRecord {
  stepName: string;

  status: ExecutionStatus;

  startedAt?: number;

  finishedAt?: number;

  error?: string;
}

export interface WorkflowExecutionContext {
  requestId: string;

  userInput: string;

  data: Record<string, unknown>;

  steps: StepExecutionRecord[];
}
