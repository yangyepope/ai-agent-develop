import { Agent } from './agent.js';

import type { AgentMessage } from '../types/message.js';

import type { AgentState, ToolCallRecord } from '../types/agent-state.js';

import { ToolRegistry } from '../tools/tool-registry.js';

export class AgentLoop {
  /*
   * 字段要显式声明 + 在构造函数里逐个赋值。
   *
   * 不能写成 constructor(private readonly agent: Agent) 这种
   * "构造器参数属性"简写 —— tsconfig 打开了 erasableSyntaxOnly
   * （见 tsconfig.json 第 19 行），它要求所有 TS 语法都能被
   * "擦除"成纯净的 JavaScript：
   *
   *   参数属性看起来像只是加了个修饰符，实际上编译器要额外生成
   *   this.agent = agent 这类赋值语句，属于"改代码"而不是"删类型"，
   *   所以要被拦下。
   *
   * 之所以要这么严，是因为这个项目允许 Node 24 直接执行 .ts 文件 ——
   * Node 做的只是"删掉类型标注"，不会做任何语法转换。同样被禁的
   * 还有 enum、namespace 这类编译后需要生成运行时代码的写法。
   */
  private readonly agent: Agent;

  private readonly toolRegistry: ToolRegistry;

  constructor(agent: Agent, toolRegistry: ToolRegistry) {
    this.agent = agent;

    this.toolRegistry = toolRegistry;
  }

  async run(task: string, sessionId = 'default-session', maxSteps = 8): Promise<AgentState> {
    const state: AgentState = {
      sessionId,

      task,

      messages: [
        {
          role: 'user',

          content: task,
        },
      ],

      toolCalls: [],

      step: 0,

      maxSteps,

      status: 'running',

      finalAnswer: null,

      error: null,
    };

    try {
      while (state.step < state.maxSteps) {
        state.step++;
        console.log(state.step);

        console.log(`\n========== Agent Step ${state.step} ==========`);

        const response = await this.agent.runLLM(state.messages);

        const message = response.choices[0]?.message;

        if (!message) {
          throw new Error('LLM 没有返回消息');
        }

        /*
         * 情况一：
         *
         * LLM 直接返回最终答案。
         */

        if (!message.tool_calls || message.tool_calls.length === 0) {
          const answer = message.content;

          if (!answer) {
            throw new Error('LLM 没有返回最终答案');
          }

          state.messages.push({
            role: 'assistant',

            content: answer,
          });

          state.finalAnswer = answer;

          state.status = 'completed';

          break;
        }

        /*
         * 情况二：
         *
         * LLM 请求调用 Tool。
         */

        const assistantToolCalls = message.tool_calls;

        /*
         * 必须连同 tool_calls 一起存进历史。
         *
         * 只存 content 的话，模型下一轮看到的是一条空 assistant 消息，
         * 它不知道那次工具调用是自己发起的，会重新再调一遍 ——
         * 实测同一个计算被调了 3 次、多花 2 轮请求。
         */
        state.messages.push({
          role: 'assistant',

          content: message.content ?? '',

          toolCalls: assistantToolCalls,
        });

        for (const toolCall of assistantToolCalls) {
          if (toolCall.type !== 'function') {
            continue;
          }

          const toolName = toolCall.function.name;

          const rawArguments = toolCall.function.arguments;

          console.log(`调用 Tool：${toolName}`);

          console.log(`Tool 参数：${rawArguments}`);

          /*
           * 防止调用不存在的 Tool。
           */

          if (!this.toolRegistry.has(toolName)) {
            const errorMessage = `Tool 不存在：${toolName}`;

            state.messages.push({
              role: 'tool',

              content: errorMessage,

              toolCallId: toolCall.id,

              name: toolName,
            });

            continue;
          }

          const tool = this.toolRegistry.get(toolName);

          let toolResult: string;

          try {
            /*
             * JSON 参数解析
             */

            const parsedArguments: unknown = JSON.parse(rawArguments);

            /*
             * Zod 参数校验
             */

            const input = tool.schema.parse(parsedArguments);
            console.log('======================================================');
            console.log(tool.schema.parse(parsedArguments));
            console.log(input);
            console.log('======================================================');

            /*
             * 真正执行 Tool
             */

            toolResult = await tool.execute(input, {
              sessionId,

              step: state.step,
            });
          } catch (error) {
            toolResult =
              error instanceof Error
                ? `Tool 执行失败：${error.message}`
                : `Tool 执行失败：${String(error)}`;
          }

          console.log(`Tool 返回：${toolResult}`);

          /*
           * 记录 Tool 调用。
           */

          const record: ToolCallRecord = {
            toolCallId: toolCall.id,

            toolName,

            arguments: rawArguments,

            result: toolResult,

            step: state.step,
          };

          state.toolCalls.push(record);

          /*
           * 把 Tool Result
           * 放回消息历史。
           */

          const toolMessage: AgentMessage = {
            role: 'tool',

            content: toolResult,

            toolCallId: toolCall.id,

            name: toolName,
          };

          state.messages.push(toolMessage);
        }
      }

      /*
       * 如果循环结束时仍然没有完成，
       * 说明达到最大 Step。
       */

      if (state.status === 'running') {
        state.status = 'max_steps';

        state.error = `Agent 达到最大执行次数：${state.maxSteps}`;
      }
    } catch (error) {
      state.status = 'failed';

      state.error = error instanceof Error ? error.message : String(error);
    }

    return state;
  }
}
