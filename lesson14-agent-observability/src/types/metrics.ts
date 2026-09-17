export interface TokenUsage {
  inputTokens: number;

  outputTokens: number;

  totalTokens: number;
}

export interface AgentMetrics {
  llmCalls: number;

  toolCalls: number;

  errors: number;

  retries: number;

  inputTokens: number;

  outputTokens: number;

  totalTokens: number;

  estimatedCost: number;

  durationMs: number;
}
