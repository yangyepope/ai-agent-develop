import type { Trace } from '../types/trace.js';
import { ObservabilityContext } from './observability-context.js';

export class TraceManager {
  start(sessionId: string): ObservabilityContext {
    return new ObservabilityContext(sessionId);
  }

  finishSuccess(context: ObservabilityContext): void {
    context.completeRun();
  }

  finishError(context: ObservabilityContext, error: Error): void {
    context.failRun(error.message);
  }

  getTrace(context: ObservabilityContext): Trace {
    return context.getTrace();
  }
}
