/**
 * 通用状态机引擎（无业务语义）。
 *
 * 持有三样东西：
 *   1. nodes       — Map<状态, 状态节点>，key 是状态名，value 是该状态要跑的 handler
 *   2. transitions — 转换规则表（数组），每条形如 { from, to, condition? }
 *   3. currentState — 当前状态，while 循环每圈结束时被覆盖
 *
 * 运行期（run 方法）只做一件事：while 没到终态 → 查 Map 跑当前 handler → 查转换表算下一状态。
 *
 * 业务 Agent（如 StatefulAgent）通过 addNode / addTransition 把规则塞进来，
 * 自己完全不参与控制流 —— 真正的"判断"在 Map.get 和 transitions.filter 里完成。
 */
import type { AgentState } from '../types/agent-state.js';
import { StateNode } from './state-node.js';
import type { StateNodeHandler } from './state-node.js';

import  type { StateTransition } from './state-transition.js';

export class StateMachine<TContext> {
  private readonly nodes = new Map<AgentState, StateNode<TContext>>();

  private readonly transitions: StateTransition[] = [];

  private currentState: AgentState;

  constructor(initialState: AgentState) {
    this.currentState = initialState;
  }

  /**
   * 注册一个状态节点：状态名 → handler。
   * 仅写入 Map，不执行 handler。
   */
  addNode(state: AgentState, handler: StateNodeHandler<TContext>): this {
    const node = new StateNode(state, handler);

    this.nodes.set(state, node);

    return this;
  }

  /**
   * 注册一条转换规则。仅推入数组，
   * 真正的"挑下一状态"在 findNextState 里完成。
   */
  addTransition(transition: StateTransition): this {
    this.transitions.push(transition);

    return this;
  }

  /**
   * 仅暴露当前状态给外部观察，不允许改。
   */
  getCurrentState(): AgentState {
    return this.currentState;
  }

  /**
   * 引擎主循环。每圈 4 步：
   *   ① 按 currentState 查 nodes Map 拿到 handler
   *   ② 执行 handler（业务逻辑发生在这里）
   *   ③ 查 transitions 算下一状态
   *   ④ currentState = 下一状态，回到①
   * 退出条件：currentState 进入 completed / failed（两个终态没有 handler，所以也不会被查）。
   */
  async run(context: TContext): Promise<void> {
    while (this.currentState !== 'completed' && this.currentState !== 'failed') {
      console.log(`\n==============================`);

      console.log(`当前状态：${this.currentState}`);

      console.log(`==============================`);

      const node = this.nodes.get(this.currentState);

      if (!node) {
        throw new Error(`没有找到状态节点：${this.currentState}`);
      }

      await node.execute(context);

      const nextState = this.findNextState(context);

      if (!nextState) {
        throw new Error(`状态 ${this.currentState} 没有找到下一状态`);
      }

      console.log(`状态转换：${this.currentState} → ${nextState}`);

      this.currentState = nextState;
    }

    console.log(`\n🏁 Agent 最终状态：${this.currentState}`);
  }

  /**
   * 在转换表里挑下一状态：
   *   - 过滤出所有 from === currentState 的候选规则
   *   - 按注册顺序逐条试 guard（无 guard 直接通过）
   *   - 第一条通过的返回它的 to；都不过返回 undefined（run 会抛错）
   *
   * 顺序敏感：早注册的规则优先级高。
   */
  private findNextState(context: TContext): AgentState | undefined {
    const candidates = this.transitions.filter(
      (transition) => transition.from === this.currentState,
    );

    for (const transition of candidates) {
      if (!transition.condition) {
        return transition.to;
      }

      if (transition.condition(context)) {
        return transition.to;
      }
    }

    return undefined;
  }
}