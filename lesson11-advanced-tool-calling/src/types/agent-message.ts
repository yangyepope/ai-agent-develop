export interface ToolCall {
  id: string;

  name: string;

  arguments: string;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';

  content: string | null;

  toolCalls?: ToolCall[];

  toolCallId?: string;

  name?: string;
}
