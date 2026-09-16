import { Planner } from '../planner/planner.js';

import { Executor } from '../executor/executor.js';

import type { Plan } from '../types/plan.js';

import type { ExecutionContext } from '../types/execution.js';

export class PlanningAgent {
  private readonly planner: Planner;

  private readonly executor: Executor;

  constructor(
    planner: Planner = new Planner(),

    executor: Executor = new Executor(),
  ) {
    this.planner = planner;

    this.executor = executor;
  }

  async run(task: string): Promise<{
    plan: Plan;

    execution: ExecutionContext;
  }> {
    console.log('\n==============================');

    console.log('开始分析任务');

    console.log('==============================\n');

    const plan = await this.planner.createPlan(task);

    this.printPlan(plan);

    console.log('\n==============================');

    console.log('开始执行计划');

    console.log('==============================\n');

    const execution = await this.executor.execute(plan);

    return {
      plan,
      execution,
    };
  }

  private printPlan(plan: Plan): void {
    console.log('\n任务目标：');

    console.log(plan.goal);

    console.log('\n执行计划：');

    for (const step of plan.steps) {
      console.log(`\nStep ${step.id}: ${step.title}`);

      console.log(`描述：${step.description}`);

      console.log(`依赖：${step.dependencies.length > 0 ? step.dependencies.join(', ') : '无'}`);
    }
  }
}
