import { evaluationDataset } from './dataset/evaluation-dataset.js';

import { MockAgent } from './agent/mock-agent.js';

import { AgentRunner } from './agent/agent-runner.js';

import { Evaluator } from './evaluator/evaluator.js';

import { MetricsCalculator } from './metrics/metrics-calculator.js';

import { EvaluationReporter } from './reporter/evaluation-reporter.js';

async function main() {
  console.log('================================');

  console.log('Lesson 13 - Agent Evaluation');

  console.log('================================');

  console.log(`Dataset: ${evaluationDataset.name}`);

  console.log(`Version: ${evaluationDataset.version}`);

  console.log(`Tasks: ${evaluationDataset.tasks.length}`);

  const agent = new MockAgent();

  const runner = new AgentRunner(agent);

  const evaluator = new Evaluator();

  const metricsCalculator = new MetricsCalculator();

  const reporter = new EvaluationReporter();

  const evaluationResults = [];

  for (const task of evaluationDataset.tasks) {
    const response = await runner.run(task);

    const result = evaluator.evaluate(task, response);

    evaluationResults.push(result);

    reporter.printTaskResult(result);
  }

  const metrics = metricsCalculator.calculate(evaluationResults);

  reporter.printSummary(metrics);
}

main().catch((error) => {
  console.error('程序执行失败:', error);

  process.exit(1);
});
