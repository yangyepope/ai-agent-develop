import { Agent } from './agent.js';

import { MemoryManager } from '../memory/memory-manager.js';

import type { AgentMessage } from '../types/message.js';

import type { AgentState } from '../types/agent-state.js';

export class AgentLoop {
  /*
   * 字段先声明、再在构造函数里赋值 —— 拆开写，原因同 MemoryManager：
   *
   *   1. constructor(private readonly agent: Agent) 这种"构造器参数
   *      属性"要生成 this.agent = agent 这种真实赋值语句，
   *      不属于"可擦除"的 TS 语法，被 tsconfig 的 erasableSyntaxOnly 禁掉。
   *
   *   2. private readonly maxSteps: number = 8 这种带初始值的
   *      "类字段初始化器"同样要生成赋值语句，所以也要拆。
   *      默认值 8 挪到构造函数参数上 —— 参数默认值是标准 JS 语法，
   *      不在此限制范围内。
   *
   * 字段声明本身只剩类型注解，这部分可以完全擦除，是允许的。
   */
  private readonly agent: Agent;

  private readonly memory: MemoryManager;

  private readonly maxSteps: number;

  constructor(agent: Agent, memory: MemoryManager, maxSteps: number = 8) {
    this.agent = agent;

    this.memory = memory;

    this.maxSteps = maxSteps;
  }

  async run(sessionId: string, task: string): Promise<AgentState> {
    const history = await this.memory.getMessages(sessionId);

    const state: AgentState = {
      sessionId,

      task,

      messages: history.map((message) => ({
        ...message,
      })),

      step: 0,

      maxSteps: this.maxSteps,

      status: 'running',

      finalAnswer: null,

      error: null,
    };

    try {
      /*
       * 当前用户消息
       */

      const userMessage: AgentMessage = {
        role: 'user',

        content: task,

        createdAt: Date.now(),
      };

      /*
       * 加入当前 State
       */

      state.messages.push(userMessage);

      /*
       * 保存到 Memory
       */

      await this.memory.addMessage(sessionId, userMessage);

      /*
       * Agent Loop
       */

      while (state.step < state.maxSteps) {
        state.step++;

        console.log(`\n========== Step ${state.step} ==========`);

        /*
         * 调用 LLM
         */

        const response = await this.agent.runLLM(state.messages);

        const message = response.choices[0]?.message;

        if (!message) {
          throw new Error('LLM 没有返回消息');
        }

        /*
         * LLM 返回最终答案
         */

        if (!message.content) {
          throw new Error('LLM 没有返回文本答案');
        }

        const assistantMessage: AgentMessage = {
          role: 'assistant',

          content: message.content,

          createdAt: Date.now(),
        };

        /*
         * State
         */

        state.messages.push(assistantMessage);

        /*
         * Memory
         */

        await this.memory.addMessage(sessionId, assistantMessage);

        /*
         * Final Answer
         */

        state.finalAnswer = message.content;

        state.status = 'completed';

        break;
      }

      if (state.status === 'running') {
        state.status = 'max_steps';

        state.error = `达到最大执行次数：${state.maxSteps}`;
      }
    } catch (error) {
      state.status = 'failed';

      state.error = error instanceof Error ? error.message : String(error);
    }

    return state;
  }
}
