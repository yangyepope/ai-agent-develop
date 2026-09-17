import { z } from 'zod';

import { ObservabilityContext } from '../observability/observability-context.js';
import { SpanManager } from '../observability/span-manager.js';
import { EventRecorder } from '../observability/event-recorder.js';

export class ObservableTool {
  private readonly spanManager: SpanManager;

  private readonly eventRecorder: EventRecorder;

  constructor(spanManager: SpanManager, eventRecorder: EventRecorder) {
    // erasableSyntaxOnly 禁用构造器参数属性，须显式声明字段并在构造器内赋值
    this.spanManager = spanManager;

    this.eventRecorder = eventRecorder;
  }

  async execute<TSchema extends z.ZodTypeAny, TResult>(
    context: ObservabilityContext,
    name: string,
    schema: TSchema,
    input: unknown,
    handler: (value: z.infer<TSchema>) => Promise<TResult>,
    parentSpanId?: string,
  ): Promise<TResult> {
    const span = this.spanManager.start(context, `tool.${name}`, 'tool', parentSpanId, {
      toolName: name,
    });

    this.eventRecorder.record(
      context,
      'tool.started',
      {
        toolName: name,
        input,
      },
      span.spanId,
    );

    try {
      const parsed = schema.safeParse(input);

      if (!parsed.success) {
        const errorMessage = parsed.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');

        throw new Error(`Tool 参数校验失败: ${errorMessage}`);
      }

      const result = await handler(parsed.data);

      span.attributes.result = result;

      this.spanManager.finish(span, 'success');

      this.eventRecorder.record(
        context,
        'tool.completed',
        {
          toolName: name,
          result,
        },
        span.spanId,
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.spanManager.finish(span, 'error', message);

      this.eventRecorder.record(
        context,
        'tool.error',
        {
          toolName: name,
          error: message,
        },
        span.spanId,
      );

      throw error;
    }
  }
}
