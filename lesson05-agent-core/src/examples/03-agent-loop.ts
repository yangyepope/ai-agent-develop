import { Agent } from '../agent/agent.js';

import { AgentLoop } from '../agent/agent-loop.js';

async function main(): Promise<void> {
  const agent = new Agent();

  const loop = new AgentLoop(agent);

  const task = `
请处理这个任务：

计算：

100 + 200

并最终告诉我答案。
`;

  const state = await loop.run(task, 5);

  console.log('\nAgent 最终状态：');

  console.log(JSON.stringify(state, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);

  process.exit(1);
});
