/**
 * TrajectoryEvaluator —— 执行轨迹评估器（评估流水线的第 5 个维度）。
 *
 * 定位：前面 4 个评估器都只看"**结果**"（最后调了哪些工具、参数对不对、答案对不对），
 * 本评估器看的是"**过程**"——Agent 的推理轨迹（trajectory）是否完整、像话。
 * 这是 Agent 评估区别于传统单轮 LLM 评估的关键一层：**路径对了，结果才可复现**。
 *
 * 轨迹是什么：AgentResponse.trajectory 是一个按时间排列的步骤数组，每步形如
 *   { type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer', content, timestamp }
 * 即"想了什么 → 调了什么工具 → 工具返回什么 → 最终怎么回答"。
 *
 * 判定标准（三个条件同时满足才算通过）：
 *   ① 轨迹里**至少有一步** tool_call（过程里确实调用了工具，而非空轨迹）
 *   ② 实际调用次数与期望调用次数**正好相等**（不多不少）
 *   ③ 轨迹里**存在** final_answer 步骤（走完了完整闭环，没有半途中断）
 *
 * 与 ToolSelectionEvaluator 的区别：后者比的是"工具**名字**对不对"，
 * 本评估器比的是"调用**次数**是否正好" + "轨迹结构是否完整"——补充了"多调了工具"这个
 * 前者不扣分、后者会扣分的维度（两者视角不同，刻意互补）。
 *
 * 已知局限（刻意的取舍）：
 *   - 不校验步骤**顺序**（thought 是否在 tool_call 之前），只看"存在性"
 *   - 不比对工具名（那是 ToolSelectionEvaluator 的职责，此处只看数量）
 *   - tool_count 用的是 response.toolCalls.length（与轨迹里的 tool_call 步数可能不一致，
 *     因为二者是两份数据，本评估器只用它做数量比对）
 *   - 同样只给 0/1 分，不产生部分分
 */

import type { AgentTask } from '../types/agent-task.js';

import type { AgentResponse } from '../types/agent-response.js';

import type { EvaluationScore } from '../types/evaluation.js';

export class TrajectoryEvaluator {
  /**
   * 对单条任务做轨迹完整性判定。
   *
   * @param task      基准数据集中的期望（这里只用 expectedToolCalls.length 作为期望调用次数）
   * @param response  Agent 实际产出（这里只用 trajectory 和 toolCalls.length）
   * @returns         name 为 'trajectory' 的评估分数（score 为 1 或 0）
   */
  evaluate(task: AgentTask, response: AgentResponse): EvaluationScore {
    // 筛出"调用了工具"的步骤（对应过程中"动作"发生过的证据）
    const toolCallSteps = response.trajectory.filter((step) => step.type === 'tool_call');

    // 筛出"最终回答"的步骤（对应过程走完闭环的标志）
    const finalAnswerSteps = response.trajectory.filter((step) => step.type === 'final_answer');

    // 期望调用次数：来自数据集的人工标注
    const expectedToolCount = task.expectedToolCalls.length;

    // 实际调用次数（注意：变量名 correctToolCount 容易误读为"正确的调用数"，
    // 实际含义只是"实际调用总数"，正确与否由 toolCountReason 这个比较式决定）
    const correctToolCount = response.toolCalls.length;

    // 条件 ③：轨迹里存在最终回答步骤
    const hasFinalAnswer = finalAnswerSteps.length > 0;

    // 条件 ②：调用次数与期望**完全相等**——多调工具在此维度会被扣分
    const toolCountReason = correctToolCount === expectedToolCount;

    // 三个条件全真才通过；&& 的短路特性让判断顺序即"失败优先级"
    const passed = toolCallSteps.length > 0 && toolCountReason && hasFinalAnswer;

    return {
      name: 'trajectory',

      // 二元打分：轨迹被视为"完整/不完整"两种状态，无中间分
      score: passed ? 1 : 0,

      passed,

      // reason 目前是笼统的成败描述，不区分"没调工具 / 次数不对 / 没给最终回答"三种失败原因；
      // 若要做失败归因，可在此按条件分支细化（参考 ToolArgumentEvaluator 的 "2/3" 写法）
      reason: passed ? 'Agent 轨迹包含 Tool 调用和最终回答' : 'Agent 轨迹不完整或不符合预期',
    };
  }
}
