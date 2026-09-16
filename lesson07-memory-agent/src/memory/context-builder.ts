import type { AgentMessage } from '../types/message.js';

import type { MemoryRecord, MemoryStore } from '../types/memory.js';

/*
 * ContextBuilder —— "短期记忆"组件，统一负责：
 *
 *   1. 跟 store 打交道（getHistory / saveMessage / clear / getRecord）；
 *   2. 控制 session 内保留多少条历史消息（maxMessages）；
 *   3. 把"历史 + 当前消息"按规则拼成最终送进 LLM 的序列（build）。
 *
 * 走法 A 的关键变化：之前这些职责散在 MemoryManager + Store 两层里，
 * 现在 store 只剩"纯持久化"的责任，maxMessages 管控 + 拼装策略都在这里。
 *
 * 字段先声明、再在构造函数里赋值 —— 不用构造器参数属性，
 * 原因同 MemoryManager（tsconfig 的 erasableSyntaxOnly 不允许）。
 */
export class ContextBuilder {
  private readonly store: MemoryStore;

  private readonly maxMessages: number;

  constructor(store: MemoryStore, maxMessages: number = 20) {
    this.store = store;

    this.maxMessages = maxMessages;
  }

  /*
   * 取 session 的全部历史消息，**不做截断**。
   *
   * 截断在 build() 里按需发生；getHistory 保持"原样取出"的语义，
   * 这样上层可以做长度统计、调试日志等不需要截断的操作。
   */
  async getHistory(sessionId: string): Promise<AgentMessage[]> {
    const record = await this.store.get(sessionId);

    if (!record) {
      return [];
    }

    return record.messages.map((message) => ({
      ...message,
    }));
  }

  /*
   * 写入一条消息 + 控制短期记忆长度。
   *
   * 这是从旧 MemoryManager.addMessage 搬过来的逻辑：
   *   - 没有 session → 新建一条记录；
   *   - 已有 session → 追加；
   *   - 超过 maxMessages → 砍掉最早的多余条（保留最近 N 条）；
   *   - 始终刷新 updatedAt。
   */
  async saveMessage(sessionId: string, message: AgentMessage): Promise<void> {
    let record = await this.store.get(sessionId);

    const now = Date.now();

    if (!record) {
      record = {
        sessionId,

        messages: [],

        createdAt: now,

        updatedAt: now,
      };
    }

    record.messages.push({
      ...message,
    });

    /*
     * 控制短期记忆长度。
     */

    if (record.messages.length > this.maxMessages) {
      record.messages = record.messages.slice(-this.maxMessages);
    }

    record.updatedAt = now;

    await this.store.save(record);
  }

  /*
   * 清空某个 session 的全部历史。
   */
  async clear(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
  }

  /*
   * 取原始记录（含 createdAt / updatedAt 等元信息），
   * 主要用于调试或打印 Memory 状态。
   */
  async getRecord(sessionId: string): Promise<MemoryRecord | null> {
    return this.store.get(sessionId);
  }

  /*
   * 把"历史 + 当前消息"按规则拼成最终送进 LLM 的序列。
   *
   * 截断点：只取最近 maxMessages 条历史；当前消息**不算**在截断里。
   *
   * 这是 lesson07 的核心策略点 —— 上一轮 lesson05 / 06 都是"全量塞给
   * LLM"，这一课改成"按 maxMessages 截断"，模型能看到的上下文
   * 是有上限的，新旧对话靠"滑动窗口"自然覆盖。
   */
  build(history: AgentMessage[], currentMessage: AgentMessage): AgentMessage[] {
    const recentMessages = history.slice(-this.maxMessages);

    return [
      ...recentMessages,

      {
        ...currentMessage,
      },
    ];
  }
}