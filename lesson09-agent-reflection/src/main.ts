import { SelfHealingAgent } from './agent/self-healing-agent.js';

async function main(): Promise<void> {
  const agent = new SelfHealingAgent();

  const task = `
请制定一个从零开始学习 AI Agent
开发的完整学习计划。

要求：

1. 学习 TypeScript 基础。
2. 学习 Node.js。
3. 学习 LLM API。
4. 学习 Prompt Engineering。
5. 学习 Tool Calling。
6. 学习 Agent Loop。
7. 学习 Memory。
8. 学习 Planning。
9. 学习 Reflection。
10. 最后开发一个完整的 AI Agent。
`;

  try {
    await agent.run(task);
  } catch (error) {
    console.error('\n❌ Agent 执行失败：', error);
  }
}

main().catch((error) => {
  console.error(error);

  process.exit(1);
});
