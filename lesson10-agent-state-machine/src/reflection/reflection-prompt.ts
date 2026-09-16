import type { ExecutionContext } from '../types/execution.js';

export function buildReflectionPrompt(context: ExecutionContext): string {
  const executionHistory = context.executions
    .map((execution) => {
    return `
            Step: ${execution.step.id}
            Description: ${execution.step.description}
            Status: ${execution.status}
            Attempts: ${execution.attempts}
            Result: ${execution.result ?? ''}
            Error: ${execution.error ?? ''}
            `;
    })
    .join('\n');

  return `
            你是一个 AI Agent Reflection 模块。

            请分析当前 Agent 的执行情况。

            目标：

            ${context.goal}

            当前 Plan Version：

            ${context.planVersion}

            执行历史：

            ${executionHistory}

            请判断当前应该采取什么动作。

            可选动作：

            continue
            retry
            replan
            abort

            判断规则：

            1. 如果任务已经完成，返回 continue。
            2. 如果当前步骤只是暂时失败，并且可以重新执行，返回 retry。
            3. 如果当前计划存在问题，返回 replan。
            4. 如果任务无法继续完成，返回 abort。

            只返回 JSON：

            {
            "success": true,
            "decision": "retry",
            "reason": "失败原因",
            "suggestion": "下一步建议"
            }
            `;
            }
