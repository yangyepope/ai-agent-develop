export type EventType =
  | 'agent.started'
  | 'agent.completed'
  | 'agent.error'
  | 'llm.started'
  | 'llm.completed'
  | 'llm.error'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.error'
  | 'state.changed'
  | 'reflection.started'
  | 'reflection.completed'
  | 'retry.started'
  | 'retry.completed'
  | 'custom';

export interface ObservabilityEvent {
  eventId: string;

  traceId: string;

  spanId?: string;

  type: EventType;

  timestamp: number;

  data: Record<string, unknown>;
}
