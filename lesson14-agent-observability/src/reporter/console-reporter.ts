import type { AgentMetrics } from '../types/metrics.js';

import { ObservabilityContext } from '../observability/observability-context.js';

export class ConsoleReporter {
  print(context: ObservabilityContext, metrics: AgentMetrics): void {
    const run = context.getRun();

    const trace = context.getTrace();

    const spans = context.getSpans();

    const events = context.getEvents();

    console.log('');

    console.log('╔══════════════════════════════════════════════╗');

    console.log('║              AGENT OBSERVABILITY             ║');

    console.log('╚══════════════════════════════════════════════╝');

    console.log('');

    console.log(`Run ID       : ${run.runId}`);

    console.log(`Trace ID     : ${trace.traceId}`);

    console.log(`Status       : ${run.status}`);

    console.log(`Duration     : ${run.durationMs ?? 0} ms`);

    if (run.error) {
      console.log(`Error        : ${run.error}`);
    }

    console.log('');

    console.log('──────────────────────────────────────────────');

    console.log('Timeline');

    console.log('──────────────────────────────────────────────');

    const startTime = trace.startedAt;

    for (const event of events) {
      const elapsed = event.timestamp - startTime;

      console.log(
        `[${String(elapsed).padStart(5, ' ')} ms] ` +
          `${event.type.padEnd(22, ' ')} ` +
          this.formatEventData(event.data),
      );
    }

    console.log('');

    console.log('──────────────────────────────────────────────');

    console.log('Spans');

    console.log('──────────────────────────────────────────────');

    for (const span of spans) {
      console.log(
        `${span.type.padEnd(12, ' ')} ` +
          `${span.name.padEnd(25, ' ')} ` +
          `${String(span.durationMs ?? 0).padStart(5, ' ')} ms ` +
          `${span.status}`,
      );
    }

    console.log('');

    console.log('──────────────────────────────────────────────');

    console.log('Metrics');

    console.log('──────────────────────────────────────────────');

    console.log(`LLM Calls       : ${metrics.llmCalls}`);

    console.log(`Tool Calls      : ${metrics.toolCalls}`);

    console.log(`Errors          : ${metrics.errors}`);

    console.log(`Retries         : ${metrics.retries}`);

    console.log(`Input Tokens    : ${metrics.inputTokens}`);

    console.log(`Output Tokens   : ${metrics.outputTokens}`);

    console.log(`Total Tokens    : ${metrics.totalTokens}`);

    console.log(`Estimated Cost  : $${metrics.estimatedCost.toFixed(6)}`);

    console.log(`Duration        : ${metrics.durationMs} ms`);

    console.log('');
  }

  private formatEventData(data: Record<string, unknown>): string {
    const entries = Object.entries(data);

    if (entries.length === 0) {
      return '';
    }

    return entries.map(([key, value]) => `${key}=${this.stringify(value)}`).join(' ');
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
