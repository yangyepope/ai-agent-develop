import { config } from './config.js';

import { ToolRegistry } from './registry/tool-registry.js';

import { ToolValidator } from './validation/tool-validator.js';

import { ToolExecutor } from './executor/tool-executor.js';

import { ParallelAgent } from './agent/parallel-agent.js';

import { calculatorTool } from './tools/calculator.tool.js';

import { weatherTool } from './tools/weather.tool.js';

import { userTool } from './tools/user.tool.js';

import { orderTool } from './tools/order.tool.js';

async function main() {
  console.log('========== Lesson 12 ==========');

  console.log('Parallel Tool Execution');

  const registry = new ToolRegistry();

  registry.register(calculatorTool);

  registry.register(weatherTool);

  registry.register(userTool);

  registry.register(orderTool);

  console.log('\n注册的 Tool:', registry.names());

  const validator = new ToolValidator();

  const toolExecutor = new ToolExecutor(registry, validator);

  const agent = new ParallelAgent(toolExecutor, config.execution.maxConcurrency);

  /**
   * ============================
   * Demo 1
   * 完全独立的任务
   * ============================
   */

  console.log('\n\n========== Demo 1 ==========');

  console.log('测试多个独立 Tool 并行执行');

  const results = await agent.executeTools([
    {
      id: 'call-001',

      toolName: 'weather',

      arguments: {
        city: '北京',
      },
    },

    {
      id: 'call-002',

      toolName: 'weather',

      arguments: {
        city: '上海',
      },
    },

    {
      id: 'call-003',

      toolName: 'weather',

      arguments: {
        city: '武汉',
      },
    },

    {
      id: 'call-004',

      toolName: 'calculator',

      arguments: {
        expression: '128 * 36',
      },
    },
  ]);

  console.log('\n详细结果:');

  console.dir(results.results, {
    depth: null,
  });

  /**
   * ============================
   * Demo 2
   * 包含失败任务
   * ============================
   */

  console.log('\n\n========== Demo 2 ==========');

  console.log('测试 Partial Failure');

  const failureResults = await agent.executeTools([
    {
      id: 'call-101',

      toolName: 'weather',

      arguments: {
        city: '北京',
      },
    },

    {
      id: 'call-102',

      toolName: 'weather',

      arguments: {
        city: '不存在的城市',
      },
    },

    {
      id: 'call-103',

      toolName: 'calculator',

      arguments: {
        expression: '100 + 200',
      },
    },
  ]);

  console.log('\n失败测试结果:');

  console.dir(failureResults.results, {
    depth: null,
  });

  /**
   * ============================
   * Demo 3
   * 演示并发限制
   * ============================
   */

  console.log('\n\n========== Demo 3 ==========');

  console.log('当前最大并发数:', config.execution.maxConcurrency);

  console.log('同时执行多个天气查询');

  await agent.executeTools([
    {
      id: 'call-201',

      toolName: 'weather',

      arguments: {
        city: '北京',
      },
    },

    {
      id: 'call-202',

      toolName: 'weather',

      arguments: {
        city: '上海',
      },
    },

    {
      id: 'call-203',

      toolName: 'weather',

      arguments: {
        city: '武汉',
      },
    },

    {
      id: 'call-204',

      toolName: 'weather',

      arguments: {
        city: '广州',
      },
    },
  ]);
}

main().catch((error) => {
  console.error('程序执行失败:', error);

  process.exit(1);
});
