import type { Tool } from '../types/tool.js';

export class ToolValidator {
  validate(tool: Tool, input: unknown): void {
    const result = tool.schema.safeParse(input);

    if (result.success) {
      return;
    }

    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`参数校验失败：${message}`);
  }
}
