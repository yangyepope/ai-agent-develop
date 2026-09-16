import type { AgentMessage } from './message.js';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'max_steps';

export interface AgentState {
  sessionId: string;

  task: string;

  messages: AgentMessage[];

  step: number;

  maxSteps: number;

  status: AgentStatus;

  finalAnswer: string | null;

  error: string | null;
}
