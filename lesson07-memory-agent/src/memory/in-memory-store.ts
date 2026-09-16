import type { MemoryRecord, MemoryStore } from '../types/memory.js';

export class InMemoryStore implements MemoryStore {
  private readonly records = new Map<string, MemoryRecord>();

  async get(sessionId: string): Promise<MemoryRecord | null> {
    const record = this.records.get(sessionId);

    if (!record) {
      return null;
    }

    /*
     * 返回副本，而不是直接返回
     * Map 内部保存的对象。
     *
     * 防止外部代码直接修改内部数据。
     */

    return {
      sessionId: record.sessionId,

      messages: record.messages.map((message) => ({
        ...message,
      })),

      createdAt: record.createdAt,

      updatedAt: record.updatedAt,
    };
  }

  async save(record: MemoryRecord): Promise<void> {
    this.records.set(record.sessionId, {
      sessionId: record.sessionId,

      messages: record.messages.map((message) => ({
        ...message,
      })),

      createdAt: record.createdAt,

      updatedAt: record.updatedAt,
    });
  }

  async delete(sessionId: string): Promise<void> {
    this.records.delete(sessionId);
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.records.has(sessionId);
  }
}
