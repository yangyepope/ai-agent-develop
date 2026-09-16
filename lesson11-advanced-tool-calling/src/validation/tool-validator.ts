import { z } from 'zod';

import type { Tool } from '../types/tool.js';

export class ToolValidator {
  validate(tool: Tool, input: unknown): unknown {
    const result = tool.schema.safeParse(input);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => {
          return `${issue.path.join('.')}: ${issue.message}`;
        })
        .join('; ');

      throw new Error(`Tool 参数校验失败：${message}`);
    }

    return result.data;
  }
}
