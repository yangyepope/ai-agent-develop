import type { AgentMessage } from './message.js';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'max_steps';

export interface ToolCallRecord {
  toolCallId: string;

  toolName: string;

  arguments: string;

  result: string;

  step: number;
}

export interface AgentState {
  sessionId: string;

  task: string;

  messages: AgentMessage[];

  toolCalls: ToolCallRecord[];

  step: number;

  maxSteps: number;

  status: AgentStatus;

  finalAnswer: string | null;

  error: string | null;
}
