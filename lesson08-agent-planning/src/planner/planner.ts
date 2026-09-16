import { llmClient } from '../llm.js';
import { config } from '../config.js';

import type { Plan } from '../types/plan.js';

import { PLANNER_SYSTEM_PROMPT } from './planner-prompt.js';

export class Planner {
  async createPlan(task: string): Promise<Plan> {
    const response = await llmClient.chat.completions.create({
      model: config.llm.model,

      temperature: 0,

      messages: [
        {
          role: 'system',
          content: PLANNER_SYSTEM_PROMPT,
        },

        {
          role: 'user',
          content: task,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Planner 没有返回内容');
    }

    return this.parsePlan(content);
  }

  private parsePlan(content: string): Plan {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Planner 返回的内容不是合法 JSON：\n${content}`);
    }

    return this.validatePlan(parsed);
  }

  private validatePlan(data: unknown): Plan {
    if (!data || typeof data !== 'object') {
      throw new Error('Plan 必须是对象');
    }

    const plan = data as Record<string, unknown>;

    if (typeof plan.goal !== 'string') {
      throw new Error('Plan.goal 必须是字符串');
    }

    if (!Array.isArray(plan.steps)) {
      throw new Error('Plan.steps 必须是数组');
    }

    const steps = plan.steps.map((step, index) => {
      if (!step || typeof step !== 'object') {
        throw new Error(`Step ${index} 格式错误`);
      }

      const item = step as Record<string, unknown>;

      if (typeof item.id !== 'number') {
        throw new Error(`Step ${index}.id 必须是数字`);
      }

      if (typeof item.title !== 'string') {
        throw new Error(`Step ${index}.title 必须是字符串`);
      }

      if (typeof item.description !== 'string') {
        throw new Error(`Step ${index}.description 必须是字符串`);
      }

      if (!Array.isArray(item.dependencies)) {
        throw new Error(`Step ${index}.dependencies 必须是数组`);
      }

      const dependencies = item.dependencies.map((dependency) => {
        if (typeof dependency !== 'number') {
          throw new Error(`Step ${index}.dependencies 必须全部是数字`);
        }

        return dependency;
      });

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        dependencies,
      };
    });

    return {
      goal: plan.goal,
      steps,
    };
  }
}
