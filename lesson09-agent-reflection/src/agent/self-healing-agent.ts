import { Planner } from '../planner/planner.js';

import { Executor } from '../executor/executor.js';

import { Reflector } from '../reflection/reflector.js';

import { config } from '../config.js';

import type { Plan } from '../types/plan.js';

import type { ExecutionContext, StepExecution } from '../types/execution.js';

import type { ReflectionResult } from '../types/reflection.js';

export class SelfHealingAgent {
  private readonly planner: Planner;

  private readonly executor: Executor;

  private readonly reflector: Reflector;

  constructor(
    planner: Planner = new Planner(),

    executor: Executor = new Executor(),

    reflector: Reflector = new Reflector(),
  ) {
    this.planner = planner;

    this.executor = executor;

    this.reflector = reflector;
  }

  async run(task: string): Promise<void> {
    let plan = await this.createInitialPlan(task);

    let execution = this.createExecutionContext(plan);

    let replanCount = 0;

    while (true) {
      console.log('\n================================');

      console.log(`当前 Plan Version: ${execution.planVersion}`);

      console.log('================================');

      const completed = await this.executePlan(plan, execution);

      if (completed) {
        console.log('\n🎉 Agent 任务执行完成');

        this.printFinalResult(execution);

        return;
      }

      const failedExecution = this.findFailedExecution(execution);

      if (!failedExecution) {
        throw new Error('任务执行状态异常');
      }

      const reflection = await this.reflector.reflect(failedExecution);

      this.printReflection(reflection);

      if (reflection.decision === 'continue') {
        continue;
      }

      if (reflection.decision === 'retry') {
        const success = await this.handleRetry(failedExecution, execution);

        if (success) {
          continue;
        }

        console.log('Retry 仍然失败，继续 Reflection');

        continue;
      }

      if (reflection.decision === 'replan') {
        replanCount++;

        if (replanCount > config.agent.maxReplans) {
          throw new Error('超过最大 Re-plan 次数');
        }

        plan = await this.replan(task, plan, execution, reflection);

        execution = this.createExecutionContext(plan, execution.planVersion + 1);

        continue;
      }

      if (reflection.decision === 'abort') {
        throw new Error(`Agent 无法继续执行：${reflection.reason}`);
      }
    }
  }

  private async createInitialPlan(task: string): Promise<Plan> {
    console.log('\n🧠 Planner 正在制定初始计划...');

    const plan = await this.planner.createPlan(task);

    this.printPlan(plan);

    return plan;
  }

  private createExecutionContext(
    plan: Plan,

    planVersion: number = 1,
  ): ExecutionContext {
    return {
      goal: plan.goal,

      executions: [],

      planVersion,
    };
  }

  private async executePlan(
    plan: Plan,

    context: ExecutionContext,
  ): Promise<boolean> {
    for (const step of plan.steps) {
      const existing = context.executions.find((execution) => execution.step.id === step.id);

      if (existing && existing.status === 'completed') {
        continue;
      }

      const execution = await this.executor.executeStep(step, context);

      console.log(`\n▶ Step ${step.id}: ${step.title}`);

      console.log(`执行次数：${execution.attempts}`);

      if (execution.status === 'completed') {
        console.log('✓ Step 执行成功');

        console.log(`结果：${execution.result}`);

        continue;
      }

      console.log('✗ Step 执行失败');

      console.log(`错误：${execution.error}`);

      return false;
    }

    return true;
  }

  private findFailedExecution(context: ExecutionContext): StepExecution | undefined {
    return context.executions.find((execution) => execution.status === 'failed');
  }

  private async handleRetry(
    execution: StepExecution,

    context: ExecutionContext,
  ): Promise<boolean> {
    if (execution.attempts >= config.agent.maxRetries) {
      console.log('已经达到最大 Retry 次数');

      return false;
    }

    console.log(`\n🔄 Retry Step ${execution.step.id}`);

    const result = await this.executor.retryStep(execution, context);

    if (result.status === 'completed') {
      console.log('✓ Retry 成功');

      return true;
    }

    console.log(`✗ Retry 失败：${result.error}`);

    return false;
  }

  private async replan(
    task: string,

    oldPlan: Plan,

    context: ExecutionContext,

    reflection: ReflectionResult,
  ): Promise<Plan> {
    console.log('\n🔄 Agent 开始 Re-planning...');

    const history = context.executions
      .map((execution) => {
        return `
Step ${execution.step.id}
标题：${execution.step.title}
状态：${execution.status}
结果：${execution.result ?? '无'}
错误：${execution.error ?? '无'}
`;
      })
      .join('\n');

    const replanTask = `
原始任务：

${task}

旧计划：

${JSON.stringify(oldPlan, null, 2)}

之前的执行记录：

${history}

Reflection：

${reflection.reason}

建议：

${reflection.suggestion ?? '无'}

请根据当前执行情况，
重新制定一个更加合理的计划。

要求：

1. 保留已经成功完成并且仍然有效的工作。
2. 不要重复没有必要重复的步骤。
3. 修复导致失败的问题。
4. 生成新的完整计划。
`;

    const newPlan = await this.planner.createPlan(replanTask);

    this.printPlan(newPlan);

    return newPlan;
  }

  private printPlan(plan: Plan): void {
    console.log('\n📋 当前计划：');

    console.log(`目标：${plan.goal}`);

    for (const step of plan.steps) {
      console.log(
        `
Step ${step.id}
标题：${step.title}
描述：${step.description}
依赖：${step.dependencies.length > 0 ? step.dependencies.join(', ') : '无'}
`,
      );
    }
  }

  private printReflection(reflection: ReflectionResult): void {
    console.log('\n🔍 Reflection');

    console.log(`success：${reflection.success}`);

    console.log(`decision：${reflection.decision}`);

    console.log(`reason：${reflection.reason}`);

    if (reflection.suggestion) {
      console.log(`suggestion：${reflection.suggestion}`);
    }
  }

  private printFinalResult(context: ExecutionContext): void {
    console.log('\n================================');

    console.log('最终执行结果');

    console.log('================================');

    for (const execution of context.executions) {
      if (execution.status !== 'completed') {
        continue;
      }

      console.log(`\nStep ${execution.step.id}`);

      console.log(execution.result);
    }
  }
}
