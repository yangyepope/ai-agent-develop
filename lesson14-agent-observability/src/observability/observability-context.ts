import type { AgentRun } from '../types/run.js';
import type { Trace } from '../types/trace.js';
import type { Span } from '../types/span.js';
import type { ObservabilityEvent } from '../types/event.js';

export class ObservabilityContext {
  // readonly 仅锁定引用，属性仍可变——这是 finalize 回填 endedAt/durationMs 所必需的。
  private readonly run: AgentRun;

  private readonly trace: Trace;

  private readonly spans: Span[] = [];

  private readonly events: ObservabilityEvent[] = [];

  constructor(sessionId: string) {
    // sessionId 是观测数据的主索引之一：空串会让整条 trace 失去检索价值，fail-fast 比脏数据好。
    const normalizedSessionId = sessionId?.trim();
    if (!normalizedSessionId) {
      throw new Error('ObservabilityContext: sessionId 不能为空');
    }

    const runId = crypto.randomUUID();

    const traceId = crypto.randomUUID();

    const now = Date.now();

    this.run = {
      runId,
      traceId,
      sessionId: normalizedSessionId,
      status: 'running',
      startedAt: now,
    };

    this.trace = {
      traceId,
      runId,
      name: 'agent.run',
      startedAt: now,
    };
  }

  getRun(): AgentRun {
    // 返回浅拷贝，与 getSpans/getEvents 的封装约定保持一致，避免外部篡改内部状态。
    return { ...this.run };
  }

  getTrace(): Trace {
    return { ...this.trace };
  }

  getSpans(): Span[] {
    return [...this.spans];
  }

  getEvents(): ObservabilityEvent[] {
    return [...this.events];
  }

  addSpan(span: Span): void {
    // 跨 trace 隔离：拒绝混入其他 trace 的 span，防止链路错乱。
    if (span.traceId !== this.trace.traceId) {
      throw new Error(
        `ObservabilityContext: span.traceId(${span.traceId}) 与当前 trace(${this.trace.traceId}) 不一致`,
      );
    }
    this.spans.push(span);
  }

  addEvent(event: ObservabilityEvent): void {
    if (event.traceId !== this.trace.traceId) {
      throw new Error(
        `ObservabilityContext: event.traceId(${event.traceId}) 与当前 trace(${this.trace.traceId}) 不一致`,
      );
    }
    this.events.push(event);
  }

  completeRun(): void {
    // 幂等保护：run 已结束时直接返回，避免 durationMs 被重算、error 被错误清空。
    if (this.run.status !== 'running') {
      return;
    }
    this.run.status = 'success';
    this.finalize();
  }

  failRun(error: string): void {
    if (this.run.status !== 'running') {
      return;
    }
    this.run.status = 'error';
    this.run.error = error;
    this.finalize();
  }

  // 收尾逻辑：把 endedAt / durationMs 同时回填到 run 与 trace，避免 completeRun / failRun 重复实现。
  private finalize(): void {
    const endedAt = Date.now();
    this.run.endedAt = endedAt;
    this.run.durationMs = endedAt - this.run.startedAt;
    this.trace.endedAt = endedAt;
    this.trace.durationMs = endedAt - this.trace.startedAt;
  }
}