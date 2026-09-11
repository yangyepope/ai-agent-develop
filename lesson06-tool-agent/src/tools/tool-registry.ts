import type { AgentTool } from '../types/tool.js';

import { calculatorTool } from './calculator.tool.js';

import { currentTimeTool } from './current-time.tool.js';

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool<any>>();

  constructor() {
    this.register(calculatorTool);

    this.register(currentTimeTool);
  }

  register(tool: AgentTool<any>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool 已经存在：${tool.name}`);
    }

    this.tools.set(tool.name, tool);
  }

  get(name: string): AgentTool<any> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Tool 不存在：${name}`);
    }

    return tool;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): AgentTool<any>[] {
    return Array.from(this.tools.values());
  }
}
