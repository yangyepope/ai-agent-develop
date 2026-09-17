import { llmClient, llmModel } from './llm.js';

import { ObservableLLM } from './llm/observable-llm.js';

import { TraceManager } from './observability/trace-manager.js';

import { SpanManager } from './observability/span-manager.js';

import { EventRecorder } from './observability/event-recorder.js';

import { ObservableTool } from './tools/observable-tool.js';

import { ObservableAgent } from './agent/observable-agent.js';

import { ObservabilityCollector } from './observability/observability-collector.js';

import { ConsoleReporter } from './reporter/console-reporter.js';

async function main(): Promise<void> {
  console.log('启动 Lesson 14 - Agent Observability');

  const traceManager = new TraceManager();

  const spanManager = new SpanManager();

  const eventRecorder = new EventRecorder();

  const observableTool = new ObservableTool(spanManager, eventRecorder);

  const observableLLM = new ObservableLLM(llmClient, llmModel, spanManager, eventRecorder);

  const agent = new ObservableAgent(
    observableLLM,
    traceManager,
    spanManager,
    eventRecorder,
    observableTool,
  );

  const collector = new ObservabilityCollector();

  const reporter = new ConsoleReporter();

  const context = await agent.run('请帮我计算 128 * 36 和 11*23', 'lesson14-session');

  const metrics = collector.collectMetrics(context);

  reporter.print(context, metrics);
}

main().catch((error) => {
  console.error('程序发生未处理异常：', error);

  process.exit(1);
});
