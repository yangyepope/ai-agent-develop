import type { ToolContext } from '../types/tool.js';

import type { ToolResult } from '../types/tool-result.js';

import { ToolRegistry } from '../registry/tool-registry.js';

import { ToolExecutor } from '../executor/tool-executor.js';

export class ToolRuntime {

    private readonly registry: ToolRegistry;

    private readonly executor: ToolExecutor;

  constructor(
    registry: ToolRegistry,

    executor: ToolExecutor
  ) {

    this.registry = registry;
    this.executor = executor
  }

  async call(toolName: string, input: unknown, context: ToolContext): Promise<ToolResult> {
    console.log(`\n🔧 Tool Runtime 调用：${toolName}`);

    console.log(`📥 Tool Input：`, input);

    const result = await this.executor.execute(toolName, input, context);

    if (result.status === 'success') {
      console.log(`✅ Tool 执行成功`);

      console.log(`📤 Tool Result：`, result.data);
    } else {
      console.log(`❌ Tool 执行失败`);

      console.log(`错误：${result.error?.message}`);
    }

    console.log(`⏱️ Duration：${result.durationMs}ms`);

    return result;
  }

  listTools(): string[] {
    return this.registry.names();
  }
}
