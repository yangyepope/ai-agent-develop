export type SpanType = 'agent' | 'llm' | 'tool' | 'state' | 'reflection' | 'custom';

export type SpanStatus = 'running' | 'success' | 'error';

export interface Span {
  spanId: string;

  traceId: string;

  parentSpanId?: string;

  name: string;

  type: SpanType;

  status: SpanStatus;

  startedAt: number;

  endedAt?: number;

  durationMs?: number;

  attributes: Record<string, unknown>;

  error?: string;
}
