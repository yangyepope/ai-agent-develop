export type RunStatus = 'running' | 'success' | 'error';

export interface AgentRun {
  runId: string;

  traceId: string;

  sessionId: string;

  status: RunStatus;

  startedAt: number;

  endedAt?: number;

  durationMs?: number;

  error?: string;
}
