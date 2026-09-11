import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { llmClient } from '../llm.js';

import { config } from '../config.js';

/**
 * 调用 LLM 时可以透传的通用参数
 *
 * 这些参数和「业务想问什么」无关，属于对模型行为的调节，
 * 所以统一收口在基础服务层，由上层按需覆盖。
 */
export interface LLMRequestOptions {
  /** 采样温度，越低越稳定。结构化输出场景建议 0 ~ 0.3 */
  temperature?: number;

  /** 输出上限（token） */
  maxTokens?: number;

  /** 请求超时（毫秒） */
  timeoutMs?: number;
}

/** chat() 的返回结构 */
export interface LLMResponse {
  content: string;
}

export class LLMService {
  /**
   * 发起一次对话补全
   *
   * @param messages 对话消息，用官方类型约束，避免上层随手塞错结构
   * @param options  模型参数，不传就走默认值
   */
  async chat(
    messages: ChatCompletionMessageParam[],
    options: LLMRequestOptions = {},
  ): Promise<LLMResponse> {
    const response = await llmClient.chat.completions.create(
      {
        model: config.llm.model,

        // 结构化输出要的是稳定，默认给个低温
        temperature: options.temperature ?? 0.2,

        // 请求体里的 undefined 会在序列化成 JSON 时被丢掉，所以可以直接传
        max_tokens: options.maxTokens,

        messages,
      },
      // ⚠️ 第二个参数是「请求选项」，规则和请求体不同：
      // SDK 用 `'timeout' in options` 判断你有没有显式指定，只要 key 存在就会校验。
      // 写成 { timeout: undefined } 会让 key 存在但值非法，直接抛
      // "timeout must be an integer"。所以必须在未指定时连 key 都不要有。
      options.timeoutMs === undefined ? {} : { timeout: options.timeoutMs },
    );

    return {
      content: response.choices[0]?.message.content ?? '',
    };
  }
}
