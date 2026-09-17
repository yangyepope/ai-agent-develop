/**
 * ToolSelectionEvaluator —— 工具选择准确度评估器。
 *
 * 定位：评估流水线的第 2 个维度，回答"**工具选对了吗？**"——
 * 只关心工具**名字**这一件事，不关心参数传得对不对（那是 ToolArgumentEvaluator 的活），
 * 也不关心最终回答说了什么（那是 AnswerQualityEvaluator 的活）。
 *
 * 与 TaskSuccessEvaluator 的区别（两者都在看工具，但粒度不同）：
 *   ① TaskSuccessEvaluator：0/1 判定"**所有**必需工具都被调过吗"，混了"回答非空"一起算
 *   ② ToolSelectionEvaluator：比例判定"选对了**几个百分比**"，且只看工具选择这一维度
 *   所以同一个失败任务，前者只给"0 分 + 没完成任务"，后者能告诉你"3 个工具选对了 2 个，是选型问题不是回答问题"。
 *
 * 判定方式：把期望与实际都降维成"工具名数组"，逐个检查期望的名字在实际中是否出现，
 * 命中数 ÷ 期望总数 = score（部分分）。多余的调用不扣分（分母是期望数量）。
 *
 * 边界：任务不需要工具时，要求 Agent **也没调** 工具才给满分；
 *       若 Agent 无端调用工具 → 0 分（避免"乱调工具"在无工具任务上蒙混过关）。
 */

import type { AgentTask } from '../types/agent-task.js';

import type { AgentResponse } from '../types/agent-response.js';

import type { EvaluationScore } from '../types/evaluation.js';

export class ToolSelectionEvaluator {
  /**
   * 对单条任务做工具选择判定。
   *
   * @param task      基准数据集中的期望（只用 expectedToolCalls 的 toolName）
   * @param response  Agent 实际产出的工具调用列表（只用 toolName）
   * @returns         name 为 'tool_selection' 的评估分数（score 为 0~1 的比例）
   */
  evaluate(task: AgentTask, response: AgentResponse): EvaluationScore {
    // 降维：从完整对象数组抽出"工具名数组"（本评估器不需要 arguments / id）
    const expectedTools = task.expectedToolCalls.map((call) => call.toolName);

    const actualTools = response.toolCalls.map((call) => call.toolName);

    // 边界分支：期望为空 = 这个任务本不该用工具
    if (expectedTools.length === 0) {
      // 此时评判标准反转：Agent 什么都不调才对，调了任何工具就是多余行为
      return {
        name: 'tool_selection',

        score: actualTools.length === 0 ? 1 : 0,

        passed: actualTools.length === 0,

        reason: '任务不需要 Tool',
      };
    }

    // 分子：期望工具名在实际调用里出现过的个数。
    // includes 用的是严格相等（===）比较字符串，语义等价于 some((a) => a === name)，但更简洁
    const matched = expectedTools.filter((expected) => actualTools.includes(expected)).length;

    // 比例分：分母是**期望数量**（而非实际数量），
    // 因此"多调了无关工具"不扣分，"漏调必需工具"扣分——这正是"选型召回率"的口径
    const score = matched / expectedTools.length;

    return {
      name: 'tool_selection',

      score,

      // 必须**全部**选中才算通过；部分分只体现在 score 上
      passed: score === 1,

      // reason 保留 "2/3" 原始数据，报告里可直接看出漏选了哪类工具
      reason: `正确选择 ${matched}/${expectedTools.length} 个 Tool`,
    };
  }
}
