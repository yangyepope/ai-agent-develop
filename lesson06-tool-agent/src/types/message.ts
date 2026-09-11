import type { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  role: MessageRole;

  content: string;

  toolCallId?: string;

  name?: string;

  /*
   * 模型这一轮请求调用的工具（只有 role === 'assistant' 时才有）。
   *
   * 为什么非存不可：接口是无状态的，模型下一轮只能看到我们回传的历史。
   * 如果这里不存，历史就变成「一条空的 assistant 消息 + 一条 tool 结果」，
   * 模型看不出那次调用是它自己发起的，于是会重新决定再调一遍
   * —— 同一个工具被反复调用，白烧 token，严重时一直转到 maxSteps。
   *
   * 另外 OpenAI 官方接口要求 role: 'tool' 的消息必须紧跟在带有对应
   * tool_call_id 的 assistant 消息之后，缺了这个字段就无法构造合法请求。
   */
  toolCalls?: ChatCompletionMessageToolCall[];
}
