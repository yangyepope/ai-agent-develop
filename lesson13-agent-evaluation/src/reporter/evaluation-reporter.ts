import type { EvaluationMetrics } from '../metrics/metrics-calculator.js';

import type { EvaluationResult } from '../types/evaluation.js';

export class EvaluationReporter {
  printTaskResult(result: EvaluationResult): void {
    console.log('\n--------------------------------');

    console.log(`Task: ${result.taskId}`);

    console.log(`Total Score: ${(result.totalScore * 100).toFixed(1)}%`);

    console.log(`Passed: ${result.passed ? 'YES' : 'NO'}`);

    console.log('\n指标:');

    for (const score of result.scores) {
      console.log(`  ${score.name}: ${(score.score * 100).toFixed(1)}%`);

      console.log(`    ${score.reason}`);
    }

    console.log('--------------------------------');
  }

  printSummary(metrics: EvaluationMetrics): void {
    console.log('\n\n================================');

    console.log('       Evaluation Summary');

    console.log('================================');

    console.log(`Total Tasks: ${metrics.totalTasks}`);

    console.log(`Passed Tasks: ${metrics.passedTasks}`);

    console.log(`Failed Tasks: ${metrics.failedTasks}`);

    console.log(`Pass Rate: ${(metrics.passRate * 100).toFixed(1)}%`);

    console.log(`Average Score: ${(metrics.averageScore * 100).toFixed(1)}%`);

    console.log(`Average Duration: ${metrics.averageDurationMs.toFixed(2)}ms`);

    console.log('================================');
  }
}
