import 'dotenv/config';

import { StatefulAgent } from './agent/stateful-agent.js';

async function main(): Promise<void> {
  const agent = new StatefulAgent();

  const goal = '制定一个 TypeScript AI Agent 学习计划';

  await agent.run(goal);
}

main().catch((error) => {
  console.error('\n❌ Agent 执行失败');

  console.error(error);
});
