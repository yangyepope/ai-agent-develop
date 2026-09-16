import type { ToolContext } from '../types/tool.js';
import type { ToolResult } from '../types/tool-result.js';
import { ToolRegistry } from '../registry/tool-registry.js';
import { ToolValidator } from '../validation/tool-validator.js';

export class ToolExecutor {
  private readonly registry: ToolRegistry;
  private readonly validator: ToolValidator;
  constructor(registry: ToolRegistry, validator: ToolValidator) {
    this.registry = registry;
    this.validator = validator;
  }

  async execute(
    callId: string,
    toolName: string,
    input: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    const startedAt = Date.now();

    try {
      const tool = this.registry.get(toolName);

      this.validator.validate(tool, input);

      const data = await tool.execute(input, context);

      return {
        callId,

        toolName,

        status: 'success',

        data,

        durationMs: Date.now() - startedAt,

        requestId: context.requestId,
      };
    } catch (error) {
      return {
        callId,

        toolName,

        status: 'error',

        error: error instanceof Error ? error.message : String(error),

        durationMs: Date.now() - startedAt,

        requestId: context.requestId,
      };
    }
  }
}
