import { config } from '../config.js';
import { llmClient } from '../llm.js';

import { buildPlannerPrompt } from './planner-prompt.js';

/*
 * 纯类型导入必须写成 import type：
 * tsconfig 开启了 verbatimModuleSyntax，普通的 `import { Plan }` 会被原样保留到运行时，
 * ESM 找不到名为 Plan 的导出会直接抛错（编译期 TypeScript 也会报 TS1484）。
 */
import type { Plan, PlanStep } from '../types/plan.js';

export class Planner {
  /**
   * 根据用户目标生成执行计划
   */
  async createPlan(goal: string): Promise<Plan> {
    const prompt = buildPlannerPrompt(goal);

    const response = await llmClient.chat.completions.create({
      // 与 executor / reflector 保持一致，统一走 config：
      // process.env.LLM_MODEL! 只是编译期断言，漏配变量时会把 undefined 传给 SDK
      model: config.llm.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的 AI Agent Planner，负责将复杂任务拆解成可执行的步骤。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    // choices 可能为空数组，先取出来再做存在性判断
    const choice = response.choices[0];

    if (!choice) {
      throw new Error('Planner 没有返回任何候选结果');
    }

    // finish_reason 为 length 说明输出被 max_tokens 截断，JSON 必然不完整，
    // 提前报出可定位的错误，而不是留给 JSON.parse 报一句含糊的语法错误
    if (choice.finish_reason === 'length') {
      throw new Error('Planner 输出被截断（finish_reason=length），无法得到完整计划');
    }

    const content = choice.message?.content;

    if (!content) {
      throw new Error('Planner 没有返回任何内容');
    }

    return this.parsePlan(content);
  }

  /**
   * 将 LLM 返回的 JSON 解析成 Plan
   */
  private parsePlan(content: string): Plan {
    const jsonText = this.extractJsonText(content);

    let parsed: unknown;

    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      console.error('Planner 返回内容无法解析：');
      console.error(content);

      throw new Error(
        `Planner 返回的计划不是合法 JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }

    /*
     * 校验/归一化刻意放在 try 之外：
     * 之前 validatePlan 在 try 内部抛错，会被自己的 catch 抓住，
     * 于是"Plan 至少需要一个执行步骤"被伪装成"不是合法 JSON"，误导排查方向。
     */
    return this.normalizePlan(parsed);
  }

  /**
   * 从模型输出里抽出 JSON 文本。
   * 兼容三种常见写法：纯 JSON、```json 代码块、前后夹着解释文字。
   */
  private extractJsonText(content: string): string {
    // 去掉 Markdown 代码块围栏（```json 与 ``` 都能命中）
    let text = content.replace(/```[a-zA-Z]*\s*/g, '').trim();

    // 兜底裁剪：只保留第一个 { 到最后一个 } 之间的内容，
    // 避免模型在 JSON 前后追加"以下是计划："之类的说明文字（旧实现会直接解析失败）
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }

    return text;
  }

  /**
   * 运行时校验并归一化模型返回的计划。
   *
   * JSON.parse 的结果是 unknown，原先的 `as Plan` 只是编译期断言、不做任何检查，
   * 于是 step 可能不是对象、id 可能是 "step-1"、title 可能直接缺失 ——
   * 这些问题会一路带到 StepExecutor（提示词里出现 "undefined"）和
   * self-healing-agent（靠 step.id 判断步骤是否已完成），必须在这里挡住。
   */
  private normalizePlan(raw: unknown): Plan {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Plan 必须是一个对象');
    }

    const candidate = raw as Record<string, unknown>;
    const goal = typeof candidate.goal === 'string' ? candidate.goal.trim() : '';

    if (goal === '') {
      throw new Error('Plan.goal 缺失');
    }

    if (!Array.isArray(candidate.steps)) {
      throw new Error('Plan.steps 必须是数组');
    }

    if (candidate.steps.length === 0) {
      throw new Error('Plan 至少需要一个执行步骤');
    }

    const steps: PlanStep[] = [];
    const seenIds = new Set<number>();
    // 原始 id 写法 -> 归一化后的数字 id，用于解析 dependencies（如 "step-2" -> 2）
    const idAlias = new Map<string, number>();
    // 依赖可能引用后面的步骤，所以先收集完所有 id，再统一解析依赖
    const pending: { step: PlanStep; rawDependencies: unknown[] }[] = [];

    candidate.steps.forEach((rawStep, index) => {
      // 元素可能不是对象（如 steps: [null]），先挡住，否则下面读 .id 会抛 TypeError
      if (!rawStep || typeof rawStep !== 'object' || Array.isArray(rawStep)) {
        throw new Error(`Plan Step[${index}] 必须是对象`);
      }

      const step = rawStep as Record<string, unknown>;
      const id = this.toStepId(step.id);

      if (id === null) {
        throw new Error(`Plan Step[${index}] 的 id 必须是数字或形如 "step-1" 的字符串`);
      }

      if (seenIds.has(id)) {
        // id 重复会让 self-healing-agent 把后一个步骤误判为"已完成"而整段跳过
        throw new Error(`Plan Step id 重复：${id}`);
      }

      seenIds.add(id);

      if (typeof step.id === 'string') {
        idAlias.set(step.id.trim(), id);
      }

      const description = typeof step.description === 'string' ? step.description.trim() : '';

      if (description === '') {
        throw new Error(`Plan Step ${id} 缺少 description`);
      }

      /*
       * title 是 PlanStep 的必填字段，但 planner-prompt 的输出格式里并没有它，
       * 缺失时退化成 description 的第一行，避免执行提示词里出现 "undefined"。
       */
      const title =
        typeof step.title === 'string' && step.title.trim() !== ''
          ? step.title.trim()
          : (description.split('\n')[0] ?? description);

      const rawDependencies = step.dependencies ?? [];

      if (!Array.isArray(rawDependencies)) {
        throw new Error(`Plan Step ${id} 的 dependencies 必须是数组`);
      }

      const planStep: PlanStep = { id, title, description, dependencies: [] };

      steps.push(planStep);
      pending.push({ step: planStep, rawDependencies });
    });

    for (const { step, rawDependencies } of pending) {
      // 用 Set 去重：重复依赖会让 Executor 把同一份前置结果拼进提示词多次
      const dependencies = new Set<number>();

      for (const dependency of rawDependencies) {
        const dependencyId = this.resolveDependencyId(dependency, idAlias);

        if (dependencyId === null || !seenIds.has(dependencyId)) {
          // 悬空依赖会让 Executor.getDependencyResults 抛错并终止整个 run，
          // 这里提前报错，并直接指出是哪个步骤依赖了哪个不存在的 id
          throw new Error(`Plan Step ${step.id} 依赖了不存在的步骤：${String(dependency)}`);
        }

        if (dependencyId === step.id) {
          // 自依赖永远满足不了（执行时它自己还没完成），直接忽略
          console.warn(`Plan Step ${step.id} 依赖了自己，已忽略该依赖`);
          continue;
        }

        dependencies.add(dependencyId);
      }

      step.dependencies = [...dependencies];
    }

    return { goal, steps };
  }

  /**
   * 把模型给的 id 归一化成 PlanStep 声明的 number：
   * 1 / "1" / "step-1" / "Step 3" 都接受，取其中的第一段数字。
   */
  private toStepId(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value : null;
    }

    if (typeof value === 'string') {
      const digits = /(\d+)/.exec(value)?.[1];

      if (digits) {
        return Number(digits);
      }
    }

    return null;
  }

  /**
   * 解析单条依赖：先按原始 id 写法查表，再退回数字提取，
   * 这样 "step-1" 与 1 这类混写也能对应到同一步，不会再出现
   * "Step step-1 的执行结果不存在" 的运行期报错。
   */
  private resolveDependencyId(dependency: unknown, idAlias: Map<string, number>): number | null {
    if (typeof dependency === 'string') {
      const alias = idAlias.get(dependency.trim());

      if (alias !== undefined) {
        return alias;
      }
    }

    return this.toStepId(dependency);
  }
}
