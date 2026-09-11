import { Agent } from './agent/agent.js';

import { AgentLoop } from './agent/agent-loop.js';

import { ToolRegistry } from './tools/tool-registry.js';

import { config } from './config.js';

async function main(): Promise<void> {
  console.log('========================================');

  console.log(' Lesson 06 - Tool Calling Agent');

  console.log('========================================');

  /*
   * 创建 Tool Registry
   */

  const toolRegistry = new ToolRegistry();

  /*
   * 创建 Agent
   */

  const agent = new Agent(toolRegistry);

  /*
   * 创建 Agent Loop
   */

  const agentLoop = new AgentLoop(agent, toolRegistry);

  /*
   * 用户任务
   */

  const task = `
请帮我完成下面的任务：

计算 123 * 456。

然后告诉我计算结果。
`;

  /*
   * 运行 Agent
   */

  const state = await agentLoop.run(
    task,

    'lesson06-demo',

    config.agent.maxSteps,
  );

  /*
   * 输出结果
   */

  console.log('\n========================================');

  console.log(' Agent Status');

  console.log('========================================');

  console.log(state.status);

  console.log('\n========================================');

  console.log(' Tool Calls');

  console.log('========================================');

  console.log(JSON.stringify(state.toolCalls, null, 2));

  console.log('\n========================================');

  console.log(' Final Answer');

  console.log('========================================');

  console.log(state.finalAnswer);

  if (state.error) {
    console.log('\nError:');

    console.log(state.error);
  }
}

main().catch((error: unknown) => {
  console.error('程序启动失败：', error);

  process.exit(1);
});
