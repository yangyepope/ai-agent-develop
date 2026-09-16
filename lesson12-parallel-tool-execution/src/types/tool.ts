import { z } from 'zod';

export interface ToolContext {
  requestId: string;

  sessionId: string;

  metadata?: Record<string, unknown>;
}

export interface Tool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;

  description: string;

  schema: TSchema;

  execute(input: z.infer<TSchema>, context: ToolContext): Promise<unknown>;
}
