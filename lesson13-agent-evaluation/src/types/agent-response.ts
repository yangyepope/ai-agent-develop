import type { ToolCall } from './tool-call.js';

export interface AgentResponse {
  answer: string;

  toolCalls: ToolCall[];

  trajectory: TrajectoryStep[];

  durationMs: number;
}

export interface TrajectoryStep {
  type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer';

  content: string;

  timestamp: number;
}
