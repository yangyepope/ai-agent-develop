/**
 * TaskSuccessEvaluator —— 任务成功率评估器（lesson13「Agent 评估」的第一块基石）。
 *
 * 定位：把"Agent 跑得怎么样"这种主观感受，变成可量化、可回归的分数。
 * 这是评估流水线里最基础的一环，做**二元判定**（pass / fail → score 1 / 0）：
 *
 *   输入：AgentTask（基准数据集里的"期望"） + AgentResponse（Agent 实际跑出的"结果"）
 *   输出：EvaluationScore（单个维度的分数，供上层聚合成 EvaluationResult）
 *
 * 判定标准（两个条件同时满足才算通过）：
 *   ① 期望调用的工具都被调用到了（只比工具名）
 *   ② 最终回答非空
 *
 * 设计上刻意保持"纯函数"：无 IO、无副作用、不依赖 LLM，
 * 同样的输入永远得到同样的输出 —— 这让评估结果可复现，也让单元测试极易编写。
 *
 * 与 ToolRuntime / AgentRunner 的关系：本类**不执行**任何 Agent，
 * 只对已经跑完的 AgentResponse 做"事后判卷"，因此可以随时替换真实 Agent 为 Mock。
 *
 * 已知局限（刻意的取舍，进阶评估器再逐个解决）：
 *   - 只比工具名，不比 arguments：调 `search("乱码")` 也算"调对了工具"
 *   - 不比调用顺序、不比调用次数
 *   - 不关心工具调用本身是否失败（agent 层面失败也会算"调到了"）
 *   - expectedAnswer 未被使用：只要回答非空就给分，不判断答得对不对
 */
import type { AgentTask } from '../types/agent-task.js';

import type { AgentResponse } from '../types/agent-response.js';

import type { EvaluationScore } from '../types/evaluation.js';

export class TaskSuccessEvaluator {
  /**
   * 对单条任务做成功判定。
   *
   * @param task      基准数据集中的期望（required 工具列表等）
   * @param response  Agent 实际运行产出的回答与工具调用记录
   * @returns         name 固定为 'task_success' 的评估分数（score 为 1 或 0）
   */
  evaluate(task: AgentTask, response: AgentResponse): EvaluationScore {
    // 条件 ①：期望的工具是否"都被用上了"。
    // 注意方向：以 expectedToolCalls 为主遍历，对每个期望工具去实际调用里找——
    // 即"期望 ⊄ 实际 就失败"，而 Agent 多调了几个工具不影响通过（多余调用不算错）。
    const hasRequiredTools = task.expectedToolCalls.every((expected) =>
      response.toolCalls.some((actual) => actual.toolName === expected.toolName),
    );

    // 条件 ②：回答非空。用 trim() 兜住"只输出空白字符"这种伪回答。
    // 边界：expectedToolCalls 为空数组时 every 返回 true（vacuous truth），
    //      即"不要求调工具"的任务只看回答是否非空。
    const passed = hasRequiredTools && response.answer.trim().length > 0;

    return {
      // 维度名：多个评估器结果聚合时靠它区分"这条分是谁打的"
      name: 'task_success',

      // 二元打分：1 = 通过，0 = 不通过（本评估器不产生中间分）
      score: passed ? 1 : 0,

      passed,

      // reason 面向人和报告：解释为什么给这个分。
      // 目前是笼统的成败描述，不区分"少调了工具"还是"回答为空"——
      // 若要做失败归因分析，可在这里细化为具体缺失的工具名。
      reason: passed ? 'Agent 完成了任务并产生了有效回答' : 'Agent 没有完成任务',
    };
  }
}
