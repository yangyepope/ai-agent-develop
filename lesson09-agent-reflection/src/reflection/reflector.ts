import { llmClient } from '../llm.js';

import { config } from '../config.js';

import type { ReflectionResult } from '../types/reflection.js';

import type { StepExecution } from '../types/execution.js';

import { REFLECTION_SYSTEM_PROMPT } from './reflection-prompt.js';

export class Reflector {
  async reflect(execution: StepExecution): Promise<ReflectionResult> {
    const prompt = `
请分析下面这个任务步骤的执行情况。

Step ID：
        ${execution.step.id}

        Step 标题：
        ${execution.step.title}

        Step 描述：
        ${execution.step.description}

        执行状态：
        ${execution.status}

        执行次数：
        ${execution.attempts}

        执行结果：
        ${execution.result ?? '无'}

        错误信息：
        ${execution.error ?? '无'}

        请判断 Agent 下一步应该做什么。
`;

    const response = await llmClient.chat.completions.create({
      model: config.llm.model,

      temperature: 0,

      messages: [
        {
          role: 'system',
          content: REFLECTION_SYSTEM_PROMPT,
        },

        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Reflection 没有返回内容');
    }

    return this.parseResult(content);
  }

  private parseResult(content: string): ReflectionResult {
    let data: unknown;

    try {
      data = JSON.parse(content);
    } catch {
      throw new Error(`Reflection 返回的不是合法 JSON：\n${content}`);
    }

    return this.validateResult(data);
  }

  private validateResult(data: unknown): ReflectionResult {
    if (!data || typeof data !== 'object') {
      throw new Error('Reflection 结果必须是对象');
    }

    const result = data as Record<string, unknown>;

    if (typeof result.success !== 'boolean') {
      throw new Error('Reflection.success 必须是 boolean');
    }

    if (typeof result.decision !== 'string') {
      throw new Error('Reflection.decision 必须是字符串');
    }

    const decisions = ['continue', 'retry', 'replan', 'abort'];

    if (!decisions.includes(result.decision)) {
      throw new Error(`未知的 Reflection decision：${result.decision}`);
    }

    if (typeof result.reason !== 'string') {
      throw new Error('Reflection.reason 必须是字符串');
    }

    if (result.suggestion !== undefined && typeof result.suggestion !== 'string') {
      throw new Error('Reflection.suggestion 必须是字符串');
    }

    return {
      success: result.success,

      decision: result.decision as 'continue' | 'retry' | 'replan' | 'abort',

      reason: result.reason,

      suggestion: result.suggestion as string | undefined,
    };
  }
}
