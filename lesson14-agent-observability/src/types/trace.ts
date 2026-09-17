export interface Trace {
  traceId: string;

  runId: string;

  name: string;

  startedAt: number;

  endedAt?: number;

  durationMs?: number;
}
