/**
 * ToolArgumentEvaluator —— 工具参数准确度评估器。
 *
 * 定位：评估流水线的第 3 个维度，比 ToolSelectionEvaluator 更细一层：
 *   选对工具 ≠ 参数传对（选了 weather 却传 city='火星' 依然是错的）。
 * 本评估器专门回答："工具不仅选对了，**参数也传对了吗？**"
 *
 * 判定方式：逐条比对期望的工具调用，找到实际调用后比较 arguments 是否"相等"。
 * 与其他评估器最大不同：**输出比例分（部分分）**，而不是 0/1。
 *   若有 3 个期望工具，其中 2 个参数完全正确 → score = 2/3 ≈ 0.67，passed = false（需满分才算通过）。
 *   这样能反映出"大部分传对了"这种中间状态，便于回归时观察退化幅度。
 *
 * 匹配规则（宽松但有一致性）：
 *   - 只比 arguments，不比顺序、不比调用次数
 *   - 同名工具只取**第一个**实际调用（`find`），多余的同名调用被忽略
 *   - 期望工具在实际里根本找不到时**不计入分子**（找不到自然谈不上参数正确），
 *     分母仍是期望总数 → 相当于顺带扣了"漏调工具"的分
 */

import type { AgentTask } from '../types/agent-task.js';

import type { AgentResponse } from '../types/agent-response.js';

import type { EvaluationScore } from '../types/evaluation.js';

export class ToolArgumentEvaluator {
  /**
   * 对单条任务做参数准确度判定。
   *
   * @param task      基准数据集中的期望（用到 expectedToolCalls 的 toolName + arguments）
   * @param response  Agent 实际产出的工具调用列表
   * @returns         name 为 'tool_argument' 的评估分数（score 为 0~1 的比例）
   */
  evaluate(task: AgentTask, response: AgentResponse): EvaluationScore {
    // 边界：任务不要求调工具 → 没有参数可评 → 跳过并给满分（避免除零，也避免误伤总分）
    if (task.expectedToolCalls.length === 0) {
      return {
        name: 'tool_argument',

        score: 1,

        passed: true,

        reason: '任务不需要 Tool 参数',
      };
    }

    // 分子：参数完全正确的期望项数量（分母恒为期望总数）
    let matched = 0;

    for (const expected of task.expectedToolCalls) {
      // 按工具名找实际调用；find 只返回**第一个**匹配项（同名多次调用时后者不参与比较）
      const actual = response.toolCalls.find((call) => call.toolName === expected.toolName);

      // 工具压根没被调用 → 跳过（不计入 matched，分数自然被拉低）
      if (!actual) {
        continue;
      }

      if (this.argumentsEqual(actual.arguments, expected.arguments)) {
        matched++;
      }
    }

    // 比例分：反映"正确了几个"，而非"是否是全对"
    const score = matched / task.expectedToolCalls.length;

    return {
      name: 'tool_argument',

      score,

      // 通过标准严格：必须**全部**参数都对（部分分只体现在 score 上，不体现在 passed 上）
      passed: score === 1,

      // reason 带上 "2/3" 这类原始数据，方便报告里直接定位是哪些任务退化了
      reason: `正确参数 ${matched}/${task.expectedToolCalls.length}`,
    };
  }

  /**
   * 判断两组工具参数是否"相等"。
   *
   * 实现是**浅比较 + 全等比较（===）**：
   *   ① 键数量必须相同（多传/漏传参数都算不同）
   *   ② 每个期望键在 actual 中必须存在且值 `===`
   *
   * 已知局限（当前数据集只含字面量参数，够用）：
   *   - 只比第一层：嵌套对象/数组即使内容相同也会因引用不同而判为不相等
   *   - `===` 比较：参数顺序变化不受影响（按 key 取值），但类型不同（1 vs '1'）会判为不等
   *   - 期望里显式写 `undefined` 的键会与"实际缺失该键"区分（键数量已先判过，不会误判成相等）
   *
   * @param actual    Agent 实际传的参数
   * @param expected  数据集里人工编写的期望参数
   */
  private argumentsEqual(
    actual: Record<string, unknown>,
    expected: Record<string, unknown>,
  ): boolean {
    const actualKeys = Object.keys(actual);

    const expectedKeys = Object.keys(expected);

    // 键数量不同 → 参数多了或少了 → 直接判不相等（比"逐个键比对"更早排除）
    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }

    // 沿期望的键遍历：每个键的值都必须全等。
    // 复用 every 的短路特性——第一个不匹配就返回 false
    return expectedKeys.every((key) => actual[key] === expected[key]);
  }
}
