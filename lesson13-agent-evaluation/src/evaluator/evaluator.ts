/**
 * Evaluator —— 评估聚合器（评估流水线的"总调度"）。
 *
 * 定位：前面 5 个评估器各自只回答一个维度的问题，本类是它们的**统一入口**：
 *   一次调用跑完全部维度 → 收集 EvaluationScore[] → 聚合成 EvaluationResult。
 * 上层（未来的 EvaluationRunner / 报告脚本）只需要拿到 Evaluator 一个依赖，
 * 不必知道内部到底有哪几个评估器、各自怎么打分——**门面（Facade）模式**。
 *
 * 数据流向：
 *
 *   (AgentTask, AgentResponse)
 *        ├─ TaskSuccessEvaluator    → task_success    (0/1)   任务完成了吗
 *        ├─ ToolSelectionEvaluator  → tool_selection  (比例)  工具选对了吗
 *        ├─ ToolArgumentEvaluator   → tool_argument   (比例)  参数传对了吗
 *        ├─ AnswerQualityEvaluator  → answer_quality  (0/1)   回答内容对吗
 *        └─ TrajectoryEvaluator     → trajectory      (0/1)   过程完整吗
 *                 ↓  聚合
 *   EvaluationResult { taskId, scores[], totalScore, passed, durationMs }
 *
 * 两个聚合口径（当前实现，刻意保持简单）：
 *   - totalScore：**等权算术平均**（5 个维度权重相同）；由于各评估器分值域都是 0~1，
 *     平均值天然落在 0~1，可直接和 config.evaluation.passScore 比较
 *   - passed：要求**每一个**维度都通过（比 passScore 阈值更严格的"全绿"口径）
 *
 * 设计要点：5 个子评估器在**字段初始化时**就创建好并复用（不是每次 evaluate 都 new），
 * 因为它们是纯函数式的无状态对象——复用可以省去重复创建的开销，且线程/并发安全。
 *
 * 已知局限：
 *   - 权重写死在聚合逻辑里（等权），尚未读取 config 中的权重配置
 *   - config.evaluation 的 enableAnswerEvaluation / enableTrajectoryEvaluation 开关尚未接入，
 *     当前 5 个维度**无条件全跑**
 *   - 单个子评估器抛异常会中断整条评估（未做 try/catch 隔离，也没有"失败即 0 分"的降级）
 *   - totalScore 与 passed 的关系未使用 config.evaluation.passScore（0.8）做阈值判定，
 *     将来可改为 totalScore >= passScore 与"全绿"取其一或并存
 */

import type { AgentTask } from '../types/agent-task.js';

import type { AgentResponse } from '../types/agent-response.js';

import type { EvaluationResult, EvaluationScore } from '../types/evaluation.js';

import { TaskSuccessEvaluator } from './task-success-evaluator.js';

import { ToolSelectionEvaluator } from './tool-selection-evaluator.js';

import { ToolArgumentEvaluator } from './tool-argument-evaluator.js';

import { AnswerQualityEvaluator } from './answer-quality-evaluator.js';

import { TrajectoryEvaluator } from './trajectory-evaluator.js';

export class Evaluator {
  // 5 个子评估器：无状态、可复用，故在实例化时一次性创建为 readonly 字段
  private readonly taskSuccessEvaluator = new TaskSuccessEvaluator();

  private readonly toolSelectionEvaluator = new ToolSelectionEvaluator();

  private readonly toolArgumentEvaluator = new ToolArgumentEvaluator();

  private readonly answerQualityEvaluator = new AnswerQualityEvaluator();

  private readonly trajectoryEvaluator = new TrajectoryEvaluator();

  /**
   * 对单条任务做全维度评估。
   *
   * @param task      基准数据集中的任务（含期望工具、期望答案）
   * @param response  Agent 实际运行产出（含工具调用、回答、轨迹）
   * @returns         EvaluationResult：各维度分数 + 总分 + 是否通过 + 评估耗时
   */
  evaluate(task: AgentTask, response: AgentResponse): EvaluationResult {
    // 只统计"评估本身"的耗时（不含 Agent 运行时间）——用于监控评估开销
    const startedAt = Date.now();

    // 用数组按固定顺序收集各维度结果，顺序与下面的 push 顺序一致，
    // 报告里可以按索引/scores[i].name 稳定定位到某个维度
    const scores: EvaluationScore[] = [];

    scores.push(this.taskSuccessEvaluator.evaluate(task, response));

    scores.push(this.toolSelectionEvaluator.evaluate(task, response));

    scores.push(this.toolArgumentEvaluator.evaluate(task, response));

    scores.push(this.answerQualityEvaluator.evaluate(task, response));

    scores.push(this.trajectoryEvaluator.evaluate(task, response));

    // 总分 = 等权平均。各维度分值域均为 0~1，故平均值也在 0~1；
    // 除以 scores.length 而非写死 5，是为了将来增删评估器时不必改这里
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;

    // 通过条件：所有维度都必须 passed（"全绿"口径，比单一阈值更严格）。
    // 注意这里看的是 passed 字段而非 score——部分分评估器（如 tool_argument）需要满分才 passed
    const passed = scores.every((score) => score.passed);

    return {
      // 回填任务 id，让报告能把分数和原始任务对上号
      taskId: task.id,

      scores,

      totalScore,

      passed,

      durationMs: Date.now() - startedAt,
    };
  }
}
