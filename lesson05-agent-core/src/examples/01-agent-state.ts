import type { AgentState } from '../types/agent-state.js';

const state: AgentState = {
  task: '计算123乘以456',

  messages: [
    {
      role: 'user',
      content: '计算123444乘以456444444',
    },
  ],

  observations: [],

  currentDecision: null,

  step: 0,

  maxSteps: 5,

  status: 'idle',

  finalAnswer: null,

  error: null,
};

console.log('Agent State:');

console.log(JSON.stringify(state, null, 2));
