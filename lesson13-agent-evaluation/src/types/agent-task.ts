export interface AgentTask {
  id: string;

  input: string;

  expectedToolCalls: ExpectedToolCall[];

  expectedAnswer?: string;

  tags?: string[];
}

export interface ExpectedToolCall {
  toolName: string;

  arguments: Record<string, unknown>;
}
