import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

import { llmClient } from '../llm.js';

import { config } from '../config.js';

import { AGENT_SYSTEM_PROMPT } from '../prompts/agent.prompt.js';

import type { AgentMessage } from '../types/message.js';

// 这里必须是值导入而不是 import type —— 下面要 new 它。
// 写成 import type 的话类型能通过，运行时却没有这个绑定。
import { ToolRegistry } from '../tools/tool-registry.js';

export class Agent {
  /*
   * 注册表由外部传入（默认自己建一个）。
   *
   * 之所以做成参数而不是在类里硬写 new ToolRegistry()：
   * 测试时可以塞一个只含假工具的注册表，不必真的去调计算器和系统时间。
   *
   * 注意不能写成构造器参数属性 constructor(private readonly toolRegistry: ...)，
   * tsconfig 开了 erasableSyntaxOnly —— 那种写法会生成运行时赋值代码，
   * Node 原生执行 .ts 时不支持。所以字段和赋值要分开写。
   */
  private readonly toolRegistry: ToolRegistry;

  private readonly tools: ChatCompletionTool[];

  constructor(toolRegistry: ToolRegistry = new ToolRegistry()) {
    this.toolRegistry = toolRegistry;
    this.tools = this.buildTools();
  }

  private buildTools(): ChatCompletionTool[] {
    return this.toolRegistry.list().map(
      (tool): ChatCompletionTool => ({
        type: 'function',

        function: {
          name: tool.name,

          description: tool.description,

          parameters: tool.schema.toJSONSchema(),
        },
      }),
    );
  }

  async runLLM(messages: AgentMessage[]) {
    const llmMessages: ChatCompletionMessageParam[] = messages.map((message) => {
      if (message.role === 'tool') {
        return {
          role: 'tool',

          content: message.content,

          tool_call_id: message.toolCallId ?? '',

          ...(message.name
            ? {
                name: message.name,
              }
            : {}),
        };
      }

      /*
       * assistant 消息如果带着工具调用，必须把 tool_calls 一起发回去。
       *
       * 接口是无状态的，模型对"上一轮我调了什么"的全部认知都来自这里。
       * 少了它，后面那条 role: 'tool' 的结果就成了无主的孤儿消息。
       */
      if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
        return {
          role: 'assistant',

          /*
           * 规范要求：assistant 带 tool_calls 时，没有文本就传 null 而不是 ""。
           * 空字符串是"说了一句空话"，null 才是"这一轮只调工具、没说话"。
           */
          content: message.content === '' ? null : message.content,

          tool_calls: message.toolCalls,
        };
      }

      return {
        role: message.role,

        content: message.content,
      };
    });

    return llmClient.chat.completions.create({
      model: config.llm.model,

      messages: [
        {
          role: 'system',

          content: AGENT_SYSTEM_PROMPT,
        },

        ...llmMessages,
      ],

      // 用构造时算好的 this.tools，不要每次请求都重新构建一遍
      tools: this.tools,

      tool_choice: 'auto',
    });
  }
}
