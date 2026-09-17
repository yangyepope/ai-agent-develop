import type { AgentMetrics } from '../types/metrics.js';
import type { Span } from '../types/span.js';

import { ObservabilityContext } from './observability-context.js';

export class ObservabilityCollector {
  collectMetrics(context: ObservabilityContext): AgentMetrics {
    const spans = context.getSpans();

    const events = context.getEvents();

    const llmSpans = spans.filter((span) => span.type === 'llm');

    const toolSpans = spans.filter((span) => span.type === 'tool');

    const errors = spans.filter((span) => span.status === 'error').length;

    const retries = events.filter((event) => event.type === 'retry.started').length;

    let inputTokens = 0;

    let outputTokens = 0;

    for (const span of llmSpans) {
      inputTokens += Number(span.attributes.inputTokens ?? 0);

      outputTokens += Number(span.attributes.outputTokens ?? 0);
    }

    const totalTokens = inputTokens + outputTokens;

    const estimatedCost = this.calculateCost(inputTokens, outputTokens);

    const durationMs = context.getRun().durationMs ?? 0;

    return {
      llmCalls: llmSpans.length,

      toolCalls: toolSpans.length,

      errors,

      retries,

      inputTokens,

      outputTokens,

      totalTokens,

      estimatedCost,

      durationMs,
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    /**
     * 这里仅用于课程演示。
     *
     * 实际生产环境必须根据你使用的模型、
     * 具体 token 定价以及缓存 token 等因素计算。
     */

    const inputPrice = 0.15 / 1_000_000;

    const outputPrice = 0.6 / 1_000_000;

    return inputTokens * inputPrice + outputTokens * outputPrice;
  }
}
