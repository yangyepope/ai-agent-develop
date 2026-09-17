import type { AgentTask } from '../types/agent-task.js';

import type { AgentResponse } from '../types/agent-response.js';

import { MockAgent } from './mock-agent.js';

export class AgentRunner {
  private readonly agent: MockAgent;
  constructor(agent: MockAgent) {
    this.agent = agent;
  }

  async run(task: AgentTask): Promise<AgentResponse> {
    console.log(`\n[AgentRunner] 执行任务：${task.id}`);

    console.log(`[AgentRunner] 用户输入：${task.input}`);

    const response = await this.agent.run(task);

    console.log(`[AgentRunner] Tool Calls：${response.toolCalls.length}`);

    console.log(`[AgentRunner] 耗时：${response.durationMs}ms`);

    return response;
  }
}
