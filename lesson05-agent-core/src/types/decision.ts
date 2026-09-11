export interface ActionDecision {
  type: 'action';

  action: string;

  input: string;
}

export interface FinalDecision {
  type: 'final';

  answer: string;
}

export type AgentDecision = ActionDecision | FinalDecision;
