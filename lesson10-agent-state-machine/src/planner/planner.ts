import { llmClient } from '../llm.js';
import type { Plan } from '../types/plan.js';
import { buildPlannerPrompt } from './planner-prompt.js';

export class Planner {
  async createPlan(goal: string): Promise<Plan> {
    const prompt = buildPlannerPrompt(goal);

    const response = await llmClient.chat.completions.create({
      model: process.env.LLM_MODEL!,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的 AI Agent Planner，负责将复杂任务拆解成可执行步骤。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Planner 没有返回内容');
    }

    return this.parsePlan(content);
  }

  private parsePlan(content: string): Plan {
    let jsonText = content.trim();

    if (jsonText.startsWith('```')) {
      jsonText = jsonText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    }

    const plan = JSON.parse(jsonText) as Plan;

    this.validatePlan(plan);

    return plan;
  }

  private validatePlan(plan: Plan): void {
    if (!plan) {
      throw new Error('Plan 不存在');
    }

    if (!plan.goal) {
      throw new Error('Plan.goal 不存在');
    }

    if (!Array.isArray(plan.steps)) {
      throw new Error('Plan.steps 必须是数组');
    }

    if (plan.steps.length === 0) {
      throw new Error('Plan 至少需要一个步骤');
    }

    for (const step of plan.steps) {
      if (!step.id) {
        throw new Error('Step 缺少 id');
      }

      if (!step.description) {
        throw new Error(`Step ${step.id} 缺少 description`);
      }

      if (!Array.isArray(step.dependencies)) {
        throw new Error(`Step ${step.id} dependencies 必须是数组`);
      }
    }
  }
}
