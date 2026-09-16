export type ToolResultStatus = 'success' | 'error';

export interface ToolResult<T = unknown> {
  toolName: string;

  status: ToolResultStatus;

  data?: T;

  error?: {
    code: string;

    message: string;
  };

  durationMs: number;

  requestId: string;
}
