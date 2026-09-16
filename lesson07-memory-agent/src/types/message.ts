export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  role: MessageRole;

  content: string;

  toolCallId?: string;

  name?: string;

  createdAt: number;
}
