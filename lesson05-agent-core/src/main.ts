import { Agent } from './agent/agent.js';

import { AgentLoop } from './agent/agent-loop.js';

import { config } from './config.js';



async function main(): Promise<void> {
  console.log('======================================');

  console.log('       Lesson 05 - AI Agent');

  console.log('       Agent Core + Agent Loop');

  console.log('======================================');

  const agent = new Agent();

  const agentLoop = new AgentLoop(agent);



  const task = `
请处理下面这个任务：

计算：

12344444444444444 * 4565555555555555555555

然后告诉我计算结果。

`;

  const state = await agentLoop.run(task, config.agent.maxSteps);

  console.log('\n======================================');

  console.log('           Agent State');

  console.log('======================================');

  console.log(JSON.stringify(state, null, 2));

  console.log('\n======================================');

  console.log('           Final Answer');

  console.log('======================================');

  console.log(state.finalAnswer);
}

main().catch((error: unknown) => {
  console.error('程序运行失败：', error);

  process.exit(1);
});
