import type { Span, SpanStatus, SpanType } from '../types/span.js';

import { ObservabilityContext } from './observability-context.js';

export class SpanManager {
  start(
    context: ObservabilityContext,
    name: string,
    type: SpanType,
    parentSpanId?: string,
    attributes: Record<string, unknown> = {},
  ): Span {
    const span: Span = {
      spanId: crypto.randomUUID(),

      traceId: context.getTrace().traceId,

      parentSpanId,

      name,

      type,

      status: 'running',

      startedAt: Date.now(),

      attributes,
    };

    context.addSpan(span);

    return span;
  }

  finish(span: Span, status: SpanStatus = 'success', error?: string): void {
    const endedAt = Date.now();

    span.status = status;

    span.endedAt = endedAt;

    span.durationMs = endedAt - span.startedAt;

    if (error) {
      span.error = error;
    }
  }
}
