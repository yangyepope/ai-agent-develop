import { ConcurrencyLimiter } from '../concurrency/concurrency-limiter.js';
import { ToolExecutor } from './tool-executor.js';
import type { ToolContext } from '../types/tool.js';
import type { ToolCall } from '../types/tool-call.js';
import type { ToolResult } from '../types/tool-result.js';

export interface ParallelExecutionOptions {
  maxConcurrency: number;

  failFast?: boolean;
}

export class ParallelExecutor {
  private readonly toolExecutor: ToolExecutor;

  private readonly limiter: ConcurrencyLimiter;

  private readonly failFast: boolean;

  constructor(
    toolExecutor: ToolExecutor,
    options: ParallelExecutionOptions,
  ) {
    // erasableSyntaxOnly 禁用构造器参数属性，需显式声明字段并赋值
    this.toolExecutor = toolExecutor;

    this.failFast = options.failFast ?? false;

    this.limiter = new ConcurrencyLimiter(options.maxConcurrency);
  }

  async execute(toolCalls: ToolCall[], context: ToolContext): Promise<ToolResult[]> {
    if (toolCalls.length === 0) {
      return [];
    }

    // failFast 触发后：未启动的任务直接跳过（已启动的让其跑完，不强行中断）
    let aborted = false;

    const tasks = toolCalls.map((toolCall) => async (): Promise<ToolResult> => {
      if (aborted) {
        return {
          callId: toolCall.id,

          toolName: toolCall.toolName,

          status: 'error',

          error: 'SKIPPED_FAIL_FAST：前置任务已失败，本任务被跳过',

          durationMs: 0,

          requestId: context.requestId,
        };
      }

      const result = await this.toolExecutor.execute(
        toolCall.id,
        toolCall.toolName,
        toolCall.arguments,
        context,
      );

      if (this.failFast && result.status === 'error') {
        aborted = true;
      }

      return result;
    });

    return this.limiter.run(tasks);
  }
}
