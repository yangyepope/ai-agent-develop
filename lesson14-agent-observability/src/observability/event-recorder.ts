import type { EventType, ObservabilityEvent } from '../types/event.js';

import { ObservabilityContext } from './observability-context.js';

export class EventRecorder {
  record(
    context: ObservabilityContext,
    type: EventType,
    data: Record<string, unknown> = {},
    spanId?: string,
  ): ObservabilityEvent {
    const event: ObservabilityEvent = {
      eventId: crypto.randomUUID(),

      traceId: context.getTrace().traceId,

      spanId,

      type,

      timestamp: Date.now(),

      data,
    };

    context.addEvent(event);

    return event;
  }
}
