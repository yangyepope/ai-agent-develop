import { ToolRuntime } from '../runtime/tool-runtime.js';

import type { ToolContext } from '../types/tool.js';

export class ToolAgent {
  private readonly toolRuntime: ToolRuntime;

  constructor(toolRuntime: ToolRuntime) {
    this.toolRuntime = toolRuntime;
  }

  async callTool(toolName: string, input: unknown): Promise<void> {
    const context: ToolContext = {
      requestId: crypto.randomUUID(),

      sessionId: 'lesson11-session',
    };

    const result = await this.toolRuntime.call(toolName, input, context);

    console.log('\n========== Agent 收到 Tool Result ==========');

    console.log(JSON.stringify(result, null, 2));
  }
}
