import OpenAI from 'openai';

import type { AgentDecision, AgentTool } from '../types/agent.js';

export class SimpleAgent {
  private readonly client: OpenAI;

  private readonly model: string;

  private readonly tools: AgentTool[];

  constructor(client: OpenAI, model: string, tools: AgentTool[]) {
    this.client = client;
    this.model = model;
    this.tools = tools;
  }

  async run(userInput: string): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `
你是一个简单的 AI Agent。

你可以使用工具解决问题。

可用工具：
${this.tools.map((tool) => `- ${tool.name}: ${tool.description}`).join('\n')}

当需要工具时，请返回 JSON：

{
  "type": "tool_call",
  "toolName": "工具名称",
  "arguments": {},
  "reason": "为什么调用这个工具"
}

如果可以直接回答，请返回：

{
  "type": "final_answer",
  "answer": "最终答案",
  "reason": "为什么可以直接回答"
}

只返回 JSON。
`,
      },
      {
        role: 'user',
        content: userInput,
      },
    ];

    for (let iteration = 1; iteration <= 5; iteration++) {
      console.log();
      console.log(`Agent Loop #${iteration}`);

      console.log('Agent Messages:', messages);

      const response = await this.client.chat.completions.create({
        model: this.model,

        messages,

        temperature: 0,

        response_format: {
          type: 'json_object',
        },
      });

      const content = response.choices[0]?.message?.content;

      console.log('content:', content);

      if (!content) {
        throw new Error('LLM 没有返回内容');
      }

      const decision = this.parseDecision(content);

      console.log('Agent Decision:', decision);

      if (decision.type === 'final_answer') {
        return decision.answer ?? '';
      }

      if (decision.type === 'tool_call') {
        const tool = this.tools.find((item) => item.name === decision.toolName);

        if (!tool) {
          throw new Error(`Tool 不存在: ${decision.toolName}`);
        }

        const result = await tool.execute(decision.arguments ?? {});

        messages.push({
          role: 'assistant',
          content,
        });

        messages.push({
          role: 'user',
          content: `
Tool Result:

${JSON.stringify(result)}
`,
        });

        continue;
      }
    }

    throw new Error('Agent 超过最大循环次数');
  }

  private parseDecision(content: string): AgentDecision {
    try {
      const parsed = JSON.parse(content);

      return parsed as AgentDecision;
    } catch {
      throw new Error(`Agent Decision JSON 解析失败: ${content}`);
    }
  }
}
