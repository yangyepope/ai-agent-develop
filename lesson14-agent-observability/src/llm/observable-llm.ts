import type OpenAI from 'openai';

import { SpanManager } from '../observability/span-manager.js';
import { EventRecorder } from '../observability/event-recorder.js';
import { ObservabilityContext } from '../observability/observability-context.js';

export class ObservableLLM {
  private readonly client: OpenAI;

  private readonly model: string;

  private readonly spanManager: SpanManager;

  private readonly eventRecorder: EventRecorder;

  constructor(
    client: OpenAI,
    model: string,
    spanManager: SpanManager,
    eventRecorder: EventRecorder,
  ) {
    // erasableSyntaxOnly 禁用构造器参数属性，须显式声明字段并在构造器内赋值
    this.client = client;

    this.model = model;

    this.spanManager = spanManager;

    this.eventRecorder = eventRecorder;
  }

  async chat(
    context: ObservabilityContext,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
    parentSpanId?: string,
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
    const span = this.spanManager.start(context, 'llm.call', 'llm', parentSpanId, {
      model: this.model,
    });

    this.eventRecorder.record(
      context,
      'llm.started',
      {
        model: this.model,
        messageCount: messages.length,
        toolCount: tools?.length ?? 0,
      },
      span.spanId,
    );

    try {
      const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: this.model,
        messages,
      };

      if (tools && tools.length > 0) {
        request.tools = tools;

        request.tool_choice = 'auto';
      }

      const response = await this.client.chat.completions.create(request);

      const message = response.choices[0]?.message;

      if (!message) {
        throw new Error('LLM 没有返回消息');
      }

      const toolCallCount = message.tool_calls?.length ?? 0;

      span.attributes.toolCallCount = toolCallCount;

      const usage = response.usage;

      const inputTokens = usage?.prompt_tokens ?? 0;

      const outputTokens = usage?.completion_tokens ?? 0;

      const totalTokens = usage?.total_tokens ?? 0;

      span.attributes.inputTokens = inputTokens;

      span.attributes.outputTokens = outputTokens;

      span.attributes.totalTokens = totalTokens;

      span.attributes.finishReason = response.choices[0]?.finish_reason;

      const answer = message.content ?? '';

      span.attributes.responseLength = answer.length;

      this.spanManager.finish(span, 'success');

      this.eventRecorder.record(
        context,
        'llm.completed',
        {
          inputTokens,
          outputTokens,
          totalTokens,
          toolCallCount,
        },
        span.spanId,
      );

      return message;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.spanManager.finish(span, 'error', message);

      this.eventRecorder.record(
        context,
        'llm.error',
        {
          error: message,
        },
        span.spanId,
      );

      throw error;
    }
  }
}
