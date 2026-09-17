import type { AgentTask } from '../types/agent-task.js';

import type { AgentResponse } from '../types/agent-response.js';

export class MockAgent {
  async run(task: AgentTask): Promise<AgentResponse> {
    const startedAt = Date.now();

    const toolCalls = this.generateToolCalls(task);

    const trajectory = [];

    trajectory.push({
      type: 'tool_call' as const,

      content: `调用 Tool: ${toolCalls.map((call) => call.toolName).join(', ')}`,

      timestamp: Date.now(),
    });

    const answer = this.generateAnswer(task, toolCalls);

    trajectory.push({
      type: 'final_answer' as const,

      content: answer,

      timestamp: Date.now(),
    });

    return {
      answer,

      toolCalls,

      trajectory,

      durationMs: Date.now() - startedAt,
    };
  }

  private generateToolCalls(task: AgentTask) {
    return task.expectedToolCalls.map((expected) => ({
      id: `call-${Math.random().toString(36).slice(2)}`,

      toolName: expected.toolName,

      arguments: expected.arguments,
    }));
  }

  private generateAnswer(task: AgentTask, toolCalls: AgentResponse['toolCalls']): string {
    if (toolCalls.length === 0) {
      return '没有调用工具。';
    }

    return `已完成任务：${task.input}`;
  }
}
