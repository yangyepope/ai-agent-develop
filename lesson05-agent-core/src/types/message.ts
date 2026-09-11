export type MessageRole = 'system' | 'user' | 'assistant';

export interface AgentMessage {
  role: MessageRole;

  content: string;
}
