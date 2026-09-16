export type ReflectionDecision = 'continue' | 'retry' | 'replan' | 'abort';

export interface ReflectionResult {
  success: boolean;

  decision: ReflectionDecision;

  reason: string;

  suggestion?: string;
}
