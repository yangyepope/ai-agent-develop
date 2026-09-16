import { config } from './config.js';

import { Agent } from './agent/agent.js';

import { AgentLoop } from './agent/agent-loop.js';

import { InMemoryStore } from './memory/in-memory-store.js';

import { MemoryManager } from './memory/memory-manager.js';

import { ContextBuilder } from './memory/context-builder.js';

async function main(): Promise<void> {
  console.log('========================================');

  console.log(' Lesson 07 - Agent Memory');

  console.log('========================================');

  /*
   * 1. 创建 Memory Store
   */

  const memoryStore = new InMemoryStore();

  /*
   * 2. 创建 Context Builder
   *
   * ContextBuilder 负责：
   *   - 跟 store 打交道；
   *   - 控制 maxMessages（短期记忆上限）；
   *   - 把"历史 + 当前消息"按规则拼成送进 LLM 的序列。
   */

  const contextBuilder = new ContextBuilder(
    memoryStore,

    config.memory.maxMessages,
  );

  /*
   * 3. 创建 Memory Manager
   *
   * MemoryManager 现在是 ContextBuilder 的薄门面，
   * 对外保留稳定的 CRUD API（getMessages / addMessage 等），
   * 真正和 store / maxMessages 相关的事都在 ContextBuilder 里。
   */

  const memoryManager = new MemoryManager(contextBuilder);

  /*
   * 3. 创建 Agent
   */

  const agent = new Agent();

  /*
   * 4. 创建 Agent Loop
   */

  const agentLoop = new AgentLoop(
    agent,

    memoryManager,

    config.agent.maxSteps,
  );

  /*
   * Session ID
   */

  //   const sessionId = 'demo-session-001';
  const sessionA = 'session-A';

  const sessionB = 'session-B';

  /*
   * 第一轮对话
   */

  console.log('\n========== 第一轮对话 ==========');

  const result1 = await agentLoop.run(
    // sessionId,
    sessionA,

    '你好，我叫张三。',
  );

  console.log('\nAgent：');

  console.log(result1.finalAnswer);

  /*
   * 第二轮对话
   */

  console.log('\n========== 第二轮对话 ==========');

  const result2 = await agentLoop.run(
    // sessionId,
    sessionB,

    '你还记得我叫什么吗？',
  );

  console.log('\nAgent：');

  console.log(result2.finalAnswer);

  /*
   * 查看 Memory
   */

  console.log('\n========== Memory ==========');

  //   const memory = await memoryManager.getRecord(sessionId);
  const memory = await memoryManager.getRecord(sessionA);

  console.log(JSON.stringify(memory, null, 2));
}

main().catch((error: unknown) => {
  console.error('程序启动失败：', error);

  process.exit(1);
});
