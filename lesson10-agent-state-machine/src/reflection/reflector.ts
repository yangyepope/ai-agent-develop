import { llmClient } from '../llm.js';
import type { ExecutionContext } from '../types/execution.js';
import type { ReflectionResult } from '../types/reflection.js';
import { buildReflectionPrompt } from './reflection-prompt.js';

export class Reflector {
  async reflect(context: ExecutionContext): Promise<ReflectionResult> {
    const prompt = buildReflectionPrompt(context);

    const response = await llmClient.chat.completions.create({
      model: process.env.LLM_MODEL!,
      messages: [
        {
          role: 'system',
          content: '你是一个负责 Agent 自我反思和错误恢复的 Reflection 模块。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Reflection 没有返回结果');
    }

    return this.parseResult(content);
  }

  private parseResult(content: string): ReflectionResult {
    let jsonText = content.trim();

    if (jsonText.startsWith('```')) {
      jsonText = jsonText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    }

    const result = JSON.parse(jsonText) as ReflectionResult;

    this.validate(result);

    return result;
  }

  private validate(result: ReflectionResult): void {
    const validDecisions = ['continue', 'retry', 'replan', 'abort'];

    if (!result.decision) {
      throw new Error('Reflection 缺少 decision');
    }

    if (!validDecisions.includes(result.decision)) {
      throw new Error(`非法 Reflection decision：${result.decision}`);
    }

    if (!result.reason) {
      throw new Error('Reflection 缺少 reason');
    }
  }
}
