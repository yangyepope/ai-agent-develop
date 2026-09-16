/**
 * Stateful Agent：lesson10 的核心业务类。
 *
 * 把 Planner / Executor / Reflector 三个能力包装成"按状态推进"的流程：
 *
 *   planning ──→ executing ──→ reflecting ──┬─→ completed（decision === continue）
 *                                            ├─→ executing （decision === 'retry'，retryCount ≤ 2）
 *                                            ├─→ planning  （decision === 'replan'，replanCount ≤ 2）
 *                                            └─→ failed    （decision === 'abort' 或 retry/replan 超限）
 *
 * 本类不维护 currentState —— 状态托管给 StateMachine，自己只存业务数据：
 *   plan / reflection / executionContext / retryCount / replanCount
 *
 * 控制权分工：
 *   StateMachine 管"现在该跑哪个状态、下一步去哪"（引擎）
 *   本类        管"每个状态里具体做什么、什么条件走哪条边"（业务）
 *
 * 入口：run(goal) → 把 goal 装进 context → 调 stateMachine.run() 启动循环。
 */
import { Planner } from '../planner/planner.js';
import { Executor } from '../executor/executor.js';
import { Reflector } from '../reflection/reflector.js';

import type { ExecutionContext } from '../types/execution.js';

import type { ReflectionResult } from '../types/reflection.js';

import { StateMachine } from '../state-machine/state-machine.js';

import type { AgentState } from '../types/agent-state.js';

export class StatefulAgent {
  private readonly planner: Planner;

  private readonly executor: Executor;

  private readonly reflector: Reflector;

  private readonly stateMachine: StateMachine<AgentContext>;

  private plan: Awaited<ReturnType<Planner['createPlan']>> | null = null;

  private reflection: ReflectionResult | null = null;

  private context: ExecutionContext;

  private retryCount = 0;

  private replanCount = 0;

  constructor(
    planner: Planner = new Planner(),
    executor: Executor = new Executor(),
    reflector: Reflector = new Reflector(),
  ) {
    this.planner = planner;
    this.executor = executor;
    this.reflector = reflector;

    this.context = {
      goal: '',
      executions: [],
      planVersion: 1,
    };

    this.stateMachine = this.createStateMachine();
  }

  /**
   * 对外入口。初始化一份新的 ExecutionContext，
   * 然后委托给 StateMachine 启动 while 循环。
   */
  async run(goal: string): Promise<void> {
    console.log('\n');
    console.log('================================');
    console.log('       Stateful AI Agent');
    console.log('================================');

    this.context = {
      goal,
      executions: [],
      planVersion: 1,
    };

    await this.stateMachine.run(this.createAgentContext());
  }

  /**
   * "画图纸"：构造一台状态机并把所有规则塞进去。
   *
   * 这一步**不执行任何业务逻辑** —— handler / 转换规则只是被登记到 Map 和数组里。
   * 真正驱动循环的是 StateMachine.run()，它按 currentState 查 Map、按 transitions 算下一状态。
   *
   * 内部结构：
   *   ① 3 个 addNode：每个状态各自的 handler（completed / failed 是终态，不注册）
   *   ② 2 条无条件 addTransition：planning → executing → reflecting
   *   ③ 5 条带 guard 的 addTransition：reflecting → 4 个去向（含 retry/replan 超限 → failed）
   */
  private createStateMachine(): StateMachine<AgentContext> {
    const machine = new StateMachine<AgentContext>('planning');

    /**
     * PLANNING
     */
    machine.addNode('planning', async () => {
      console.log('\n🧠 Agent 正在进行 Planning...');

      this.plan = await this.planner.createPlan(this.context.goal);

      console.log('\n📋 Plan：');

      for (const step of this.plan.steps) {
        console.log(`${step.id}: ${step.description}`);
      }

      console.log(`Plan Version: ${this.context.planVersion}`);
    });

    /**
     * EXECUTING
     */
    machine.addNode('executing', async () => {
      if (!this.plan) {
        throw new Error('执行阶段不存在 Plan');
      }

      console.log('\n⚙️ Agent 正在执行 Plan...');

      /**
       * 如果是 Retry，
       * 只重新执行失败步骤。
       *
       * 为了让示例简单，
       * 这里重新创建执行上下文。
       */
      if (this.retryCount > 0) {
        this.context.executions = this.context.executions.filter(
          (execution) => execution.status === 'success',
        );
      }

      await this.executor.execute(this.plan, this.context);
    });

    /**
     * REFLECTING
     */
    machine.addNode('reflecting', async () => {
      console.log('\n🔍 Agent 正在进行 Reflection...');

      this.reflection = await this.reflector.reflect(this.context);

      console.log(`Reflection decision: ${this.reflection.decision}`);

      console.log(`Reason: ${this.reflection.reason}`);

      if (this.reflection.suggestion) {
        console.log(`Suggestion: ${this.reflection.suggestion}`);
      }
    });

    /**
     * PLANNING → EXECUTING
     */
    machine.addTransition({
      from: 'planning',
      to: 'executing',
    });

    /**
     * EXECUTING → REFLECTING
     */
    machine.addTransition({
      from: 'executing',
      to: 'reflecting',
    });

    /**
     * REFLECTING → COMPLETED
     */
    machine.addTransition({
      from: 'reflecting',
      to: 'completed',
      condition: () => {
        return this.reflection?.decision === 'continue';
      },
    });

    /**
     * REFLECTING → EXECUTING
     *
     * retry
     */
    machine.addTransition({
      from: 'reflecting',
      to: 'executing',
      condition: () => {
        if (this.reflection?.decision !== 'retry') {
          return false;
        }

        this.retryCount += 1;

        return this.retryCount <= 2;
      },
    });

    /**
     * REFLECTING → PLANNING
     *
     * replan
     */
    machine.addTransition({
      from: 'reflecting',
      to: 'planning',
      condition: () => {
        if (this.reflection?.decision !== 'replan') {
          return false;
        }

        this.replanCount += 1;

        this.context.planVersion += 1;

        return this.replanCount <= 2;
      },
    });

    /**
     * REFLECTING → FAILED
     *
     * abort
     */
    machine.addTransition({
      from: 'reflecting',
      to: 'failed',
      condition: () => {
        return this.reflection?.decision === 'abort';
      },
    });

    /**
     * Retry / Replan 超限
     */
    machine.addTransition({
      from: 'reflecting',
      to: 'failed',
      condition: () => {
        if (this.reflection?.decision === 'retry') {
          return this.retryCount > 2;
        }

        if (this.reflection?.decision === 'replan') {
          return this.replanCount > 2;
        }

        return false;
      },
    });

    return machine;
  }

  /**
   * 把当前业务状态打包成 AgentContext 喂给 StateMachine。
   * 注意这里用 getter 而非快照：condition 闭包读到的是"最新"的 plan / reflection，
   * 所以循环里下一次 evaluate guard 时总能看到上一步的写入。
   */
  private createAgentContext(): AgentContext {
    return {
      goal: this.context.goal,
      executionContext: this.context,
      getPlan: () => this.plan,
      getReflection: () => this.reflection,
    };
  }
}

export interface AgentContext {
  goal: string;

  executionContext: ExecutionContext;

  getPlan: () => Awaited<ReturnType<Planner['createPlan']>> | null;

  getReflection: () => ReflectionResult | null;
}
