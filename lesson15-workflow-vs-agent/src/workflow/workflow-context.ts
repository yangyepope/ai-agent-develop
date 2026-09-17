import type { WorkflowExecutionContext } from '../types/execution.js';

export class WorkflowContext {
  private readonly context: WorkflowExecutionContext;

  constructor(userInput: string) {
    this.context = {
      requestId: crypto.randomUUID(),
      userInput,
      data: {},
      steps: [],
    };
  }

  getState(): WorkflowExecutionContext {
    return this.context;
  }

  set(key: string, value: unknown): void {
    this.context.data[key] = value;
  }

  get<T>(key: string): T | undefined {
    return this.context.data[key] as T | undefined;
  }
}
