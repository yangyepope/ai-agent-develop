import type { AgentTask } from './agent-task.js';

export interface EvaluationDataset {
  name: string;

  version: string;

  tasks: AgentTask[];
}
