import type { AgentMessage } from './message.js';

export interface MemoryRecord {
  sessionId: string;

  messages: AgentMessage[];

  createdAt: number;

  updatedAt: number;
}

export interface MemoryStore {
  get(sessionId: string): Promise<MemoryRecord | null>;

  save(record: MemoryRecord): Promise<void>;

  delete(sessionId: string): Promise<void>;

  exists(sessionId: string): Promise<boolean>;
}
