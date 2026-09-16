export interface PlanStep {
  id: number;

  title: string;

  description: string;

  dependencies: number[];
}

export interface Plan {
  goal: string;

  steps: PlanStep[];
}
