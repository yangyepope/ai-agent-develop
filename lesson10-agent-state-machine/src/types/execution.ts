// 纯类型导入必须写 import type：tsconfig 开启了 verbatimModuleSyntax，
// 否则这行会被原样保留到运行时，ESM 找不到 PlanStep 这个导出会直接抛错（编译期也报 TS1484）。
import type { PlanStep } from './plan.js';

/**
 * 单个步骤在一次执行中的生命周期状态：
 *
 * pending → running → success | failed
 *
 * pending：尚未开始（计划创建后的初始状态）
 * running：正在执行
 * success：执行成功，result 有值
 * failed ：执行失败，error 有值（可被状态机重试或触发 re-plan）
 */
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed';

/**
 * 一个步骤的执行记录，是 ExecutionContext.executions 的元素。
 *
 * 它是"可变的运行时记录"：状态机在每个阶段原地推进 status，
 * 并写下 attempts / result / error，所以除 step 外的字段都保持可写。
 */
export interface StepExecution {
  /** 被执行的步骤定义。执行过程中不允许替换，否则依赖查找会错位。 */
  readonly step: PlanStep;

  /** 当前阶段，由状态机推进，不要手动乱改。 */
  status: ExecutionStatus;

  /** 仅当 status === 'success' 时有值。 */
  result?: string;

  /** 仅当 status === 'failed' 时有值；重试前应显式清空，避免读到上一次的失败信息。 */
  error?: string;

  /** 已尝试次数：每进入一次 running 自增，用于判断是否超过最大重试次数。 */
  attempts: number;
}

/**
 * 一次计划执行过程中的上下文。
 * re-plan 时会带着新的 planVersion 重建，靠 planVersion 区分新旧计划的执行结果。
 */
export interface ExecutionContext {
  /** 当前计划对应的目标。 */
  goal: string;

  /** 该 planVersion 下所有步骤的执行记录。 */
  executions: StepExecution[];

  /** 计划版本号：每 re-plan 一次 +1。 */
  planVersion: number;
}
