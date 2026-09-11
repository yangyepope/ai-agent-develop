import { llmClient } from '../llm.js';

import { config } from '../config.js';

import { AGENT_SYSTEM_PROMPT } from '../prompts/agent.prompt.js';

import type { AgentMessage } from '../types/message.js';

import type { AgentDecision } from '../types/decision.js';

export class Agent {
  async decide(messages: AgentMessage[]): Promise<AgentDecision> {
    const response = await llmClient.chat.completions.create({
      model: config.llm.model,

      temperature: 0.2,

      messages: [
        {
          role: 'system',
          content: AGENT_SYSTEM_PROMPT,
        },

        ...messages,
      ],
    });

    const content = response.choices[0]?.message.content;

    if (!content) {
      throw new Error('LLM 没有返回内容');
    }

    try {
      const decision = JSON.parse(content) as AgentDecision;

      return decision;
    } catch {
      throw new Error(`Agent 返回的内容不是合法 JSON：${content}`);
    }
  }
}
