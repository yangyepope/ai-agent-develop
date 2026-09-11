import type { AgentMessage } from './message.js';

import type { AgentDecision } from './decision.js';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AgentObservation {
  action: string;

  input: string;

  output: string;
}

export interface AgentState {
  task: string;

  messages: AgentMessage[];

  observations: AgentObservation[];

  currentDecision: AgentDecision | null;

  step: number;

  maxSteps: number;

  status: AgentStatus;

  finalAnswer: string | null;

  error: string | null;
}
