import { PlanningAgent } from './agent/planning-agent.js';

async function main(): Promise<void> {
  const agent = new PlanningAgent();

  const task = `
请制定一个从零开始学习 TypeScript
并最终掌握 AI Agent 开发的学习计划。

要求：

1. 先学习 TypeScript 基础
2. 然后学习 Node.js
3. 然后学习 LLM API
4. 然后学习 Tool Calling
5. 然后学习 Agent
6. 最后完成一个 AI Agent 项目
`;

  try {
    const result = await agent.run(task);

    console.log('\n==============================');

    console.log('全部任务执行完成');

    console.log('==============================\n');

    for (const execution of result.execution.executions) {
      console.log(`\nStep ${execution.step.id}`);

      console.log(`状态：${execution.status}`);

      console.log(`结果：${execution.result}`);
    }
  } catch (error) {
    console.error('\nAgent 执行失败：', error);
  }
}

main().catch((error) => {
  console.error(error);

  process.exit(1);
});
