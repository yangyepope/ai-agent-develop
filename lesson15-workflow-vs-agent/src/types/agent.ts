export interface AgentDecision {
  type: 'tool_call' | 'final_answer';

  toolName?: string;

  arguments?: Record<string, unknown>;

  answer?: string;

  reason: string;
}

export interface AgentTool {
  name: string;

  description: string;

  execute(arguments_: Record<string, unknown>): Promise<unknown>;
}
