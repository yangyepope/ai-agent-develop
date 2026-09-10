export type IssueLevel = "HIGH" | "MEDIUM" | "LOW";

export type IssueCategory =
  | "BUG"
  | "PERFORMANCE"
  | "CONCURRENCY"
  | "DATABASE"
  | "REDIS"
  | "EXCEPTION"
  | "MAINTAINABILITY";

export interface CodeIssue {
  level: IssueLevel;
  category: IssueCategory;
  problem: string;
  reason: string;
  suggestion: string;
}

export interface CodeReviewResult {
  summary: string;
  issues: CodeIssue[];
}