import type { PlanStep } from './plan.js';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface StepExecution {
  step: PlanStep;

  status: ExecutionStatus;

  result?: string;

  error?: string;

  attempts: number;
}

export interface ExecutionContext {
  goal: string;

  executions: StepExecution[];

  planVersion: number;
}
