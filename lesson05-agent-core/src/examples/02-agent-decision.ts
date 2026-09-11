import { Agent } from '../agent/agent.js';

async function main(): Promise<void> {
  const agent = new Agent();

  const messages = [
    {
      role: 'user' as const,

      content: '计算100乘以20，并告诉我结果',
    },
  ];

  const decision = await agent.decide(messages);

  console.log('Agent Decision:');

  console.log(JSON.stringify(decision, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);

  process.exit(1);
});
