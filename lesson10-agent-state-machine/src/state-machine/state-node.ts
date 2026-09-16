import type  { AgentState } from '../types/agent-state.js';

export interface StateNodeContext {
  state: AgentState;
}

export type StateNodeHandler<TContext> = (context: TContext) => Promise<void>;

export class StateNode<TContext> {
    public readonly state: AgentState

    private readonly handler: StateNodeHandler<TContext>
  constructor( 
    state: AgentState,
    handler: StateNodeHandler<TContext>
  ) {
    this.state = state;
    this.handler = handler;
  }

  async execute(context: TContext): Promise<void> {
    await this.handler(context);
  }
}
