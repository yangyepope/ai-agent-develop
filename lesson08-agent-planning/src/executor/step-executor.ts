import { llmClient } from '../llm.js';
import { config } from '../config.js';

import type { PlanStep } from '../types/plan.js';

export class StepExecutor {
  async execute(step: PlanStep, previousResults: string[]): Promise<string> {
    const previousContext =
      previousResults.length > 0 ? previousResults.join('\n\n') : '暂无前置步骤结果';

    const prompt = `
                    你现在是 AI Agent 的任务执行器。

                    请执行下面这个任务。

                    任务名称：
                    ${step.title}

                    任务描述：
                    ${step.description}

                    前置步骤执行结果：
                    ${previousContext}

                    要求：

                    1. 根据任务描述完成当前步骤。
                    2. 可以参考前置步骤的执行结果。
                    3. 不需要重新解释整个任务。
                    4. 直接返回当前步骤的执行结果。
                    `;

    const response = await llmClient.chat.completions.create({
      model: config.llm.model,

      temperature: 0.2,

      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error(`Step ${step.id} 执行失败：LLM 没有返回内容`);
    }

    return content;
  }
}
