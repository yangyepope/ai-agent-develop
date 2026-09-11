export interface CodeIssue {
  type: 'bug' | 'performance' | 'security';

  level: 'low' | 'medium' | 'high';

  message: string;

  suggestion: string;
}

export interface CodeReviewResult {
  summary: string;

  score: number;

  issues: CodeIssue[];
}
