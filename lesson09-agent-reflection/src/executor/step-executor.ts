// import { llmClient } from '../llm.js';

// import { config } from '../config.js';

// import type { PlanStep } from '../types/plan.js';

// export class StepExecutor {
//   async execute(step: PlanStep, previousResults: string[]): Promise<string> {
//     const previousContext =
//       previousResults.length > 0 ? previousResults.join('\n\n') : '暂无前置步骤结果';

//     const prompt = `
//         你是一个 AI Agent 的任务执行器。

//         现在需要执行一个具体任务。

//         任务名称：
//         ${step.title}

//         任务描述：
//         ${step.description}

//         前置任务结果：
//         ${previousContext}

//         请完成当前任务。

//         要求：

//         1. 只关注当前任务。
//         2. 可以参考前置任务结果。
//         3. 输出清晰、具体的结果。
//         4. 不要输出 JSON。
// `;

//     const response = await llmClient.chat.completions.create({
//       model: config.llm.model,

//       temperature: 0.2,

//       messages: [
//         {
//           role: 'user',
//           content: prompt,
//         },
//       ],
//     });

//     const content = response.choices[0]?.message?.content;

//     if (!content) {
//       throw new Error(`Step ${step.id} 没有执行结果`);
//     }

//     return content;
//   }
// }

import { llmClient } from "../llm.js";

import { config } from "../config.js";

import type { PlanStep } from "../types/plan.js";

export class StepExecutor {
  private readonly attemptMap =
    new Map<number, number>();

  async execute(
    step: PlanStep,
    previousResults: string[]
  ): Promise<string> {
    const currentAttempt =
      (this.attemptMap.get(step.id) ??
        0) + 1;

    this.attemptMap.set(
      step.id,
      currentAttempt
    );

    /*
     * Demo：
     * Step 2 第一次执行故意失败。
     *
     * 用来观察：
     *
     * Execute
     * ↓
     * Failure
     * ↓
     * Reflection
     * ↓
     * Retry
     * ↓
     * Success
     */
    if (
      step.id === 2 &&
      currentAttempt === 1
    ) {
      throw new Error(
        "模拟错误：Step 2 第一次执行失败"
      );
    }

    const previousContext =
      previousResults.length > 0
        ? previousResults.join("\n\n")
        : "暂无前置步骤结果";

    const prompt = `
你是一个 AI Agent 的任务执行器。

任务名称：

${step.title}

任务描述：

${step.description}

这是当前 Step 的第 ${currentAttempt} 次执行。

前置任务结果：

${previousContext}

请完成当前任务。

要求：

1. 只关注当前任务。
2. 参考前置任务结果。
3. 输出具体执行结果。
4. 不要输出 JSON。
`;

    const response =
      await llmClient.chat.completions.create({
        model: config.llm.model,

        temperature: 0.2,

        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

    const content =
      response.choices[0]?.message?.content;

    if (!content) {
      throw new Error(
        `Step ${step.id} 没有执行结果`
      );
    }

    return content;
  }
}