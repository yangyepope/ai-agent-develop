import { randomUUID } from 'node:crypto';

import type { ToolCall } from '../types/tool-call.js';

import { ToolExecutor } from '../executor/tool-executor.js';
import { ParallelExecutor } from '../executor/parallel-executor.js';

import { ResultAggregator } from '../aggregator/result-aggregator.js';

export class ParallelAgent {
  private readonly parallelExecutor: ParallelExecutor;

  private readonly aggregator = new ResultAggregator();

  constructor(toolExecutor: ToolExecutor, maxConcurrency: number) {
    this.parallelExecutor = new ParallelExecutor(toolExecutor, {
      maxConcurrency,
    });
  }

  async executeTools(toolCalls: ToolCall[]) {
    const requestId = randomUUID();

    const sessionId = 'lesson12-session';

    console.log('\n================================');

    console.log('Parallel Agent 开始执行');

    console.log('Request ID:', requestId);

    console.log('Tool 数量:', toolCalls.length);

    console.log('================================');

    const startedAt = Date.now();

    const results = await this.parallelExecutor.execute(toolCalls, {
      requestId,

      sessionId,
    });

    const batchDurationMs = Date.now() - startedAt;

    const aggregated = this.aggregator.aggregate(results, batchDurationMs);

    console.log('\n========== 执行结果 ==========');

    console.log('总任务:', aggregated.total);

    console.log('成功:', aggregated.success);

    console.log('失败:', aggregated.failed);

    console.log('并行总耗时:', aggregated.batchDurationMs, 'ms');

    console.log('Tool 时间总和:', aggregated.toolDurationMs, 'ms');

    return aggregated;
  }
}
