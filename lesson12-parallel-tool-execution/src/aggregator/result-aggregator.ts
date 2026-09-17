import type { ToolResult } from '../types/tool-result.js';

export interface AggregatedResult {
  total: number;

  success: number;

  failed: number;

  batchDurationMs: number;

  toolDurationMs: number;

  results: ToolResult[];
}

export class ResultAggregator {
  aggregate(results: ToolResult[], batchDurationMs: number): AggregatedResult {
    const success = results.filter((result) => result.status === 'success').length;

    const failed = results.filter((result) => result.status === 'error').length;

    const toolDurationMs = results.reduce((total, result) => total + result.durationMs, 0);

    return {
      total: results.length,

      success,

      failed,

      batchDurationMs,

      toolDurationMs,

      results,
    };
  }
}
