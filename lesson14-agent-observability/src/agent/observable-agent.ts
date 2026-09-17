import { z } from 'zod';

import type OpenAI from 'openai';

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

import { ObservableLLM } from '../llm/observable-llm.js';

import { calculator, calculatorSchema } from '../tools/calculator.tool.js';

import { ObservableTool } from '../tools/observable-tool.js';

import { TraceManager } from '../observability/trace-manager.js';

import { SpanManager } from '../observability/span-manager.js';

import { EventRecorder } from '../observability/event-recorder.js';

import { ObservabilityContext } from '../observability/observability-context.js';

import type { AgentState } from '../types/agent.js';

export class ObservableAgent {
  private static readonly MAX_STEPS = 8;

  private readonly llm: ObservableLLM;

  private readonly traceManager: TraceManager;

  private readonly spanManager: SpanManager;

  private readonly eventRecorder: EventRecorder;

  private readonly observableTool: ObservableTool;

  constructor(
    llm: ObservableLLM,
    traceManager: TraceManager,
    spanManager: SpanManager,
    eventRecorder: EventRecorder,
    observableTool: ObservableTool,
  ) {
    // erasableSyntaxOnly 禁用构造器参数属性，须显式声明字段并在构造器内赋值
    this.llm = llm;

    this.traceManager = traceManager;

    this.spanManager = spanManager;

    this.eventRecorder = eventRecorder;

    this.observableTool = observableTool;
  }

  async run(input: string, sessionId: string): Promise<ObservabilityContext> {
    const context = this.traceManager.start(sessionId);

    this.eventRecorder.record(context, 'agent.started', {
      input,
    });

    let currentState: AgentState = 'idle';

    try {
      currentState = this.changeState(context, currentState, 'planning');

      const agentSpan = this.spanManager.start(context, 'agent.run', 'agent', undefined, {
        input,
      });

      const finalAnswer = await this.runToolLoop(context, input, agentSpan.spanId);

      currentState = this.changeState(context, currentState, 'completed');

      spanLog(agentSpan, {
        finalAnswer,
      });

      this.spanManager.finish(agentSpan, 'success');

      this.eventRecorder.record(
        context,
        'agent.completed',
        {
          result: finalAnswer,
        },
        agentSpan.spanId,
      );

      this.traceManager.finishSuccess(context);

      return context;
    } catch (error) {
      currentState = this.changeState(context, currentState, 'failed');

      const message = error instanceof Error ? error.message : String(error);

      this.eventRecorder.record(context, 'agent.error', {
        error: message,
        state: currentState,
      });

      this.traceManager.finishError(context, new Error(message));

      return context;
    }
  }

  /*
   * 真正的 Tool-Calling 循环：
   *
   * 1. 把工具定义（JSON Schema）连同消息一起发给模型；
   * 2. 模型返回 tool_calls 就执行工具、把结果写回消息历史；
   * 3. 模型不再请求工具时，其文本内容就是最终答案。
   *
   * 之前的问题：根本没给模型传 tools，模型只能自己心算
   * （所以 llmAnswer 里直接出现 4608 / 253），而正则抠出来的
   * "工具调用"只是流程表演，不是模型发起的。
   */
  private async runToolLoop(
    context: ObservabilityContext,
    input: string,
    parentSpanId: string,
  ): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          '你是一个数学 Agent。所有算术计算必须调用 calculator 工具完成，禁止自己心算。' +
          '有多个算式时逐个调用工具，收到全部结果后用中文汇总最终答案。',
      },
      {
        role: 'user',
        content: input,
      },
    ];

    for (let step = 1; step <= ObservableAgent.MAX_STEPS; step++) {
      const message = await this.llm.chat(context, messages, this.buildTools(), parentSpanId);

      console.log('===============================================');
      console.log('message:', message);
      // console.log(message.tool_calls?.map((c) => c.function.arguments));
      console.log(JSON.stringify(message, null, 2));
      console.log('message.tool_calls:', message.tool_calls);
      console.log('===============================================');

      const toolCalls = message.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const answer = message.content ?? '';

        if (!answer) {
          throw new Error('LLM 没有返回最终答案');
        }

        return answer;
      }

      // 进入工具执行阶段只记录一次 state.changed（EventType 里没有 agent.tool_loop，用 custom）
      if (step === 1) {
        this.eventRecorder.record(
          context,
          'state.changed',
          {
            from: 'planning',
            to: 'executing',
          },
          parentSpanId,
        );
      }

      this.eventRecorder.record(
        context,
        'custom',
        {
          phase: 'agent.tool_loop',
          step,
          toolCallCount: toolCalls.length,
        },
        parentSpanId,
      );

      /*
       * assistant 消息必须连同 tool_calls 一起写回历史。
       *
       * 只存 content 的话，模型下一轮看到的是一条空消息，
       * 不知道那些工具调用是自己发起的，会重复调用。
       */
      messages.push({
        role: 'assistant',
        content: message.content ?? null,
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') {
          continue;
        }

        const toolResult = await this.executeToolCall(context, toolCall, parentSpanId);

        messages.push({
          role: 'tool',
          content: toolResult,
          tool_call_id: toolCall.id,
        });
      }
    }

    throw new Error(`Agent 达到最大执行步数：${ObservableAgent.MAX_STEPS}`);
  }

  private async executeToolCall(
    context: ObservabilityContext,
    // 只要 function 型工具调用（调用处已按 type === 'function' 收窄）
    toolCall: {
      id: string;
      function: { name: string; arguments: string };
    },
    parentSpanId: string,
  ): Promise<string> {
    let toolResult: string;

    try {
      const rawArguments: unknown = JSON.parse(toolCall.function.arguments);

      const result = await this.observableTool.execute(
        context,
        'calculator',
        calculatorSchema,
        rawArguments,
        calculator,
        parentSpanId,
      );

      toolResult = String(result);
    } catch (error) {
      /*
       * 工具失败不让 Agent 直接崩掉：
       * 把错误信息作为 tool 消息喂回模型，让它自行调整。
       */
      toolResult =
        error instanceof Error
          ? `Tool 执行失败：${error.message}`
          : `Tool 执行失败：${String(error)}`;
    }

    return toolResult;
  }

  private buildTools(): ChatCompletionTool[] {
    return [
      {
        type: 'function',

        function: {
          name: 'calculator',

          description:
            '计算一个数学表达式（支持 + - * / 和括号），例如 128 * 36。所有算术必须通过该工具完成。',

          parameters: z.toJSONSchema(calculatorSchema) as Record<string, unknown>,
        },
      },
    ];
  }

  private changeState(context: ObservabilityContext, from: AgentState, to: AgentState): AgentState {
    this.eventRecorder.record(context, 'state.changed', {
      from,
      to,
    });

    return to;
  }
}

function spanLog(
  span: {
    attributes: Record<string, unknown>;
  },
  data: Record<string, unknown>,
): void {
  Object.assign(span.attributes, data);
}
