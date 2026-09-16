import type { AgentMessage } from '../types/message.js';

import type { MemoryRecord } from '../types/memory.js';

import { ContextBuilder } from './context-builder.js';

/*
 * MemoryManager —— Memory 对外暴露的"业务门面"。
 *
 * 字段先声明、再在构造函数里赋值 —— 不用构造器参数属性，
 * 原因见下：
 *
 *   1. constructor(private readonly store: MemoryStore) 这种
 *      "构造器参数属性"：tsconfig 打开了 erasableSyntaxOnly
 *      （见 tsconfig.json 第 19 行），参数属性要生成
 *      this.store = store 这种真实赋值语句，不属于"可擦除"的
 *      TS 语法，所以被禁。
 *
 *   2. private readonly maxMessages: number = 20 这种带初始值的
 *      "类字段初始化器"：同样要生成赋值语句，所以也要拆。
 *      字段声明本身只剩类型注解（这部分可以完全擦除，是允许的），
 *      所以单独留 `private readonly store: MemoryStore;` 这种是 OK 的。
 *
 * 走法 A 的关键变化：之前自己持有 store，现在改为持有 ContextBuilder，
 * 真正和 store 打交道的事都委托过去。这里只剩"对外的稳定 API"。
 */
export class MemoryManager {
  private readonly contextBuilder: ContextBuilder;

  constructor(contextBuilder: ContextBuilder) {
    this.contextBuilder = contextBuilder;
  }

  async getMessages(sessionId: string): Promise<AgentMessage[]> {
    return this.contextBuilder.getHistory(sessionId);
  }

  async addMessage(sessionId: string, message: AgentMessage): Promise<void> {
    await this.contextBuilder.saveMessage(sessionId, message);
  }

  async addMessages(sessionId: string, messages: AgentMessage[]): Promise<void> {
    for (const message of messages) {
      await this.contextBuilder.saveMessage(sessionId, message);
    }
  }

  async clear(sessionId: string): Promise<void> {
    await this.contextBuilder.clear(sessionId);
  }

  async getRecord(sessionId: string): Promise<MemoryRecord | null> {
    return this.contextBuilder.getRecord(sessionId);
  }
}