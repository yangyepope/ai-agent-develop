import type { ToolContext } from '../types/tool.js';

import type { ToolResult } from '../types/tool-result.js';

import { ToolRegistry } from '../registry/tool-registry.js';

import { ToolValidator } from '../validation/tool-validator.js';

export class ToolExecutor {
  private readonly registry: ToolRegistry;

  private readonly validator: ToolValidator;

  constructor(register: ToolRegistry, validator: ToolValidator) {
    this.registry = register;
    this.validator = validator;
  }

  async execute(toolName: string, rawInput: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const tool = this.registry.get(toolName);

      const input = this.validator.validate(tool, rawInput);

      const data = await tool.execute(input, context);

      return {
        toolName,

        status: 'success',

        data,

        durationMs: Date.now() - startTime,

        requestId: context.requestId,
      };
    } catch (error) {
      return {
        toolName,

        status: 'error',

        error: {
          code: 'TOOL_EXECUTION_ERROR',

          message: error instanceof Error ? error.message : String(error),
        },

        durationMs: Date.now() - startTime,

        requestId: context.requestId,
      };
    }
  }
}
