export interface EvaluationScore {
  name: string;

  score: number;

  passed: boolean;

  reason: string;
}

export interface EvaluationResult {
  taskId: string;

  scores: EvaluationScore[];

  totalScore: number;

  passed: boolean;

  durationMs: number;
}
