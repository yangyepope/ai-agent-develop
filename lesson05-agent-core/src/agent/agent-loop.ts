import type { Agent } from './agent.js';

import type { AgentState } from '../types/agent-state.js';
export class AgentLoop {
  private readonly agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }
  async run(task: string, maxSteps: number): Promise<AgentState> {
    const state: AgentState = {
      task,

      messages: [
        {
          role: 'user',
          content: task,
        },
      ],

      observations: [],

      currentDecision: null,

      step: 0,

      maxSteps,

      status: 'running',

      finalAnswer: null,

      error: null,
    };

    try {
      while (state.step < state.maxSteps) {
        state.step++;

        console.log(`\n========== Step ${state.step} ==========`);

        console.log('正在请求 LLM 决定下一步...');

        const decision = await this.agent.decide(state.messages);

        state.currentDecision = decision;

        console.log('Decision:');

        console.log(JSON.stringify(decision, null, 2));

        if (decision.type === 'final') {
          state.finalAnswer = decision.answer;

          state.status = 'completed';

          break;
        }

        /*
         * 当前课程还没有真正执行 Tool。
         *
         * 所以这里暂时模拟 Tool Observation。
         *
         * 第06课会替换成真正的 Tool Executor。
         */

        state.messages.push({
          role: 'assistant',

          content: JSON.stringify(decision),
        });

        const observation = `
            动作 ${decision.action}
            收到输入：

            ${decision.input}

            当前第05课还没有真正执行 Tool。
            `;

        state.observations.push({
          action: decision.action,

          input: decision.input,

          output: observation,
        });

        state.messages.push({
          role: 'user',

          content: `Tool Observation:\n${observation}`,
        });
      }

      if (state.status === 'running') {
        state.status = 'failed';

        state.error = `Agent 达到最大执行次数：${state.maxSteps}`;
      }
    } catch (error) {
      state.status = 'failed';

      state.error = error instanceof Error ? error.message : String(error);
    }

    return state;
  }
}
