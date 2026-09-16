import type { AgentState } from '../types/agent-state.js';

export interface StateTransition {
  from: AgentState;

  to: AgentState;

  condition?: (context: unknown) => boolean;
}
