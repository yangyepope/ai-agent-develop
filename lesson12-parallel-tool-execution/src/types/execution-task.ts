import type { ToolCall } from './tool-call.js';

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed';

export interface ExecutionTask {
  id: string;

  toolCall: ToolCall;

  status: TaskStatus;

  dependsOn: string[];

  startedAt?: number;

  finishedAt?: number;
}
