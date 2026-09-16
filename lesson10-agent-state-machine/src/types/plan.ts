export interface PlanStep {
  id: string;

  description: string;

  dependencies: string[];
}

export interface Plan {
  goal: string;

  steps: PlanStep[];
}


/**
 * 
 * 
 * 
 * export interface PlanStep {
  id: string;

  description: string;

  dependencies: string[];
}

export interface Plan {
  goal: string;

  steps: PlanStep[];
}
 * 
 * 
 * 
 * 
 * 
 * 
 */