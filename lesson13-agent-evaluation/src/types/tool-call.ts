export interface ToolCall {
  id: string;

  toolName: string;

  arguments: Record<string, unknown>;
}
