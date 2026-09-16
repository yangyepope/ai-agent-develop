export type ToolResultStatus = 'success' | 'error';

export interface ToolResult<T = unknown> {
  callId: string;

  toolName: string;

  status: ToolResultStatus;

  data?: T;

  error?: string;

  durationMs: number;

  requestId: string;
}
