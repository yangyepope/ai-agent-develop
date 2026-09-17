import type { EvaluationResult } from '../types/evaluation.js';

export interface EvaluationMetrics {
  totalTasks: number;

  passedTasks: number;

  failedTasks: number;

  passRate: number;

  averageScore: number;

  averageDurationMs: number;
}

export class MetricsCalculator {
  calculate(results: EvaluationResult[]): EvaluationMetrics {
    if (results.length === 0) {
      return {
        totalTasks: 0,

        passedTasks: 0,

        failedTasks: 0,

        passRate: 0,

        averageScore: 0,

        averageDurationMs: 0,
      };
    }

    const passedTasks = results.filter((result) => result.passed).length;

    const failedTasks = results.length - passedTasks;

    const totalScore = results.reduce((sum, result) => sum + result.totalScore, 0);

    const totalDuration = results.reduce((sum, result) => sum + result.durationMs, 0);

    return {
      totalTasks: results.length,

      passedTasks,

      failedTasks,

      passRate: passedTasks / results.length,

      averageScore: totalScore / results.length,

      averageDurationMs: totalDuration / results.length,
    };
  }
}
