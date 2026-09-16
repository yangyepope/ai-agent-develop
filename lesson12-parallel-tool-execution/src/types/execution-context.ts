import type { ExecutionTask } from './execution-task.js';
import type { ToolResult } from './tool-result.js';

export interface ExecutionContext {
  requestId: string;

  sessionId: string;

  tasks: ExecutionTask[];

  results: ToolResult[];

  metadata?: Record<string, unknown>;
}
