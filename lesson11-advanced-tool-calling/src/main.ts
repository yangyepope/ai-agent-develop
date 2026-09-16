import 'dotenv/config';

import { ToolRegistry } from './registry/tool-registry.js';

import { ToolExecutor } from './executor/tool-executor.js';

import { ToolValidator } from './validation/tool-validator.js';

import { ToolRuntime } from './runtime/tool-runtime.js';

import { ToolAgent } from './agent/tool-agent.js';

import { calculatorTool } from './tools/calculator.tool.js';

import { weatherTool } from './tools/weather.tool.js';

import { searchTool } from './tools/search.tool.js';

async function main(): Promise<void> {
  console.log('\n====================================');

  console.log('   Lesson 11 Advanced Tool Calling');

  console.log('====================================\n');

  /**
   * 1. 创建 Tool Registry
   */
  const registry = new ToolRegistry();

  /**
   * 2. 注册 Tools
   */
  registry.register(calculatorTool);

  registry.register(weatherTool);

  registry.register(searchTool);

  console.log('📦 已注册 Tools：');

  console.log(registry.names());

  /**
   * 3. 创建 Tool Executor（注入 registry + validator 两依赖）
   */
  const validator = new ToolValidator();

  const executor = new ToolExecutor(registry, validator);

  /**
   * 4. 创建 Tool Runtime
   */
  const runtime = new ToolRuntime(registry, executor);

  /**
   * 5. 创建 Agent
   */
  const agent = new ToolAgent(runtime);

  /**
   * =====================================
   * 测试 1：Calculator
   * =====================================
   */
  console.log('\n\n========== Test 1: Calculator ==========');

  await agent.callTool('calculator', {
    expression: '100 + 20 * 3',
  });

  /**
   * =====================================
   * 测试 2：Weather
   * =====================================
   */
  console.log('\n\n========== Test 2: Weather ==========');

  await agent.callTool('weather', {
    city: '武汉',
  });

  /**
   * =====================================
   * 测试 3：Search
   * =====================================
   */
  console.log('\n\n========== Test 3: Search ==========');

  await agent.callTool('search', {
    query: 'AI Agent',
    limit: 3,
  });

  /**
   * =====================================
   * 测试 4：参数错误
   * =====================================
   */
  console.log('\n\n========== Test 4: Validation Error ==========');

  await agent.callTool('weather', {
    city: 123,
  });

  /**
   * =====================================
   * 测试 5：不存在的 Tool
   * =====================================
   */
  console.log('\n\n========== Test 5: Unknown Tool ==========');

  await agent.callTool('unknown_tool', {});
}

main().catch((error) => {
  console.error('\n❌ 程序执行失败：');

  console.error(error);

  // 非零退出码让 CI / 脚本能感知失败（不用 process.exit，让输出自然排空）
  process.exitCode = 1;
});
