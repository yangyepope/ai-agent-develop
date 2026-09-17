import { runWorkflowDemo } from './demo/workflow-demo.js';

import { runAgentDemo } from './demo/agent-demo.js';

import { runHybridDemo } from './demo/hybrid-demo.js';

async function main(): Promise<void> {
  console.log('======================================');

  console.log('Lesson 17 - Workflow vs Agent');

  console.log('======================================');

  try {
    // await runWorkflowDemo();

    // await runAgentDemo();

    await runHybridDemo();

    console.log();
    console.log('======================================');

    console.log('全部 Demo 执行完成');

    console.log('======================================');
  } catch (error) {
    console.error();

    console.error('程序执行失败：');

    console.error(error);

    process.exitCode = 1;
  }
}

main();
