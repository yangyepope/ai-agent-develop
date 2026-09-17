/**
 * AnswerQualityEvaluator —— 回答质量评估器。
 *
 * 定位：评估流水线的第 4 个维度，**看最终答案的内容**（前三个都只看"动作"：
 * 任务是否完成 / 工具选得对不对 / 工具参数传得对不对，本评估器才第一次关心"答得对不对"）。
 *
 * 判定方式：把 Agent 的 answer 和任务里人工编写的 expectedAnswer 都转小写，
 * 判断 answer 是否**包含** expectedAnswer 这个子串（关键词/短语级别的匹配）。
 * 例如：expectedAnswer = '北京天气'，answer = '北京今天天气晴，25℃' → 包含 → 通过。
 *
 * 兜底设计：任务没配 expectedAnswer 时**直接给满分**（reason 说明"没有配置"）。
 * 这不是 bug，而是"不评估即不扣分"——否则没配答案的任务会永远拉低总分，
 * 让统计口径失真。属于"跳过检查"而非"检查通过"，语义差别见 reason 文案。
 */

import type { AgentTask } from '../types/agent-task.js';

import type { AgentResponse } from '../types/agent-response.js';

import type { EvaluationScore } from '../types/evaluation.js';

export class AnswerQualityEvaluator {
  /**
   * 对单条任务做回答质量判定。
   *
   * @param task      基准数据集中的期望（这里只用到 expectedAnswer）
   * @param response  Agent 实际产出（这里只用到 answer）
   * @returns         name 为 'answer_quality' 的评估分数（score 为 1 或 0）
   */
  evaluate(task: AgentTask, response: AgentResponse): EvaluationScore {
    // 前置判断：没配标准答案 → 无法评估 → 跳过并给满分，避免误伤总分
    if (!task.expectedAnswer) {
      return {
        name: 'answer_quality',

        score: 1,

        passed: true,

        // 文案刻意写成"没有配置"而非"回答正确"：这是"未检查"，不是"检查通过"
        reason: '没有配置 expectedAnswer',
      };
    }

    // 统一小写做大小写不敏感匹配（对英文有效；中文本身无大小写，无副作用）
    const answer = response.answer.toLowerCase();

    const expected = task.expectedAnswer.toLowerCase();

    // 子串包含判断：不看语序、不看语义，只要"关键词出现"就算通过。
    // 代价：Agent 说"北京天气我不清楚"这种否定句同样会命中 → 会被判为通过（已知局限）
    const passed = answer.includes(expected);

    return {
      name: 'answer_quality',

      // 二元打分：本评估器不产生部分分（对比 ToolSelection/ToolArgument 的比例分）
      score: passed ? 1 : 0,

      passed,

      reason: passed ? '最终回答包含期望信息' : '最终回答没有包含期望信息',
    };
  }
}
