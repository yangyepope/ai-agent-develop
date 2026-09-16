import type { Tool } from '../types/tool.js';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool 已经注册：${tool.name}`);
    }

    this.tools.set(tool.name, tool);
  }

  unregister(toolName: string): void {
    this.tools.delete(toolName);
  }

  get(toolName: string): Tool {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Tool 不存在：${toolName}`);
    }

    return tool;
  }

  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  names(): string[] {
    return Array.from(this.tools.keys());
  }
}
