import type OpenAI from "openai";

import { llmClient } from "../llm.ts";
import { config } from "../config.ts";
import { logger } from "../utils/logger.ts";

export type LLMMessage =
  OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface LLMRequestOptions {
  temperature?: number;
  /**
   * 单次请求最多生成的 token 数。
   *
   * 会作为 max_completion_tokens 传给服务端，限制的是「总量」
   * （推理模型的思考 token + 正文）。
   *
   * 不要改用 max_tokens：实测在推理模型上它只限制正文，
   * 思考部分不受约束，会让人误以为参数没生效。
   */
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface LLMResponse {
  content: string;
  /** 结束原因：stop=正常结束，length=触达长度上限被截断 */
  finishReason: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class LLMService {
  /**
   * 与模型对话（流式）。
   *
   * 内部使用流式请求：每收到一块内容就写到标准输出（打字机效果），
   * 全部收完后返回完整文本与 token 用量。
   *
   * 注意：一旦已经输出过内容就不再重试，否则终端里会出现重复的回答。
   */
  async chat(
    messages: LLMMessage[],
    options: LLMRequestOptions = {},
  ): Promise<LLMResponse> {
    const {
      temperature = 0.2,
      // 这里刻意不给默认值：不传就不发这个参数，由服务端决定上限。
      // 而且调用方（Conversation）每次都会显式传值，
      // 在这儿写默认值只会变成永远不生效的死代码，容易误导。
      maxTokens,
      timeoutMs = 180_000,
      maxRetries = 3,
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let streamed = false;
      const startedAt = Date.now();

      try {
        logger.info("Starting LLM request", {
          model: config.llm.model,
          attempt,
          maxRetries,
          messageCount: messages.length,
        });

        const stream =
          await llmClient.chat.completions.create(
            {
              model: config.llm.model,

              messages,

              temperature,

              stream: true,

              // 让服务端在最后一个 chunk 里带上 token 用量
              stream_options: {
                include_usage: true,
              },

              // 用 max_completion_tokens 而不是 max_tokens：
              // 推理模型上 max_tokens 只限制正文，思考不受约束
              ...(maxTokens !== undefined
                ? {
                    max_completion_tokens: maxTokens,
                  }
                : {}),
            },
            {
              timeout: timeoutMs,
            },
          );

        let content = "";
        let finishReason: string | null = null;

        let promptTokens = 0;
        let completionTokens = 0;
        let totalTokens = 0;

        let firstChunk = true;

        for await (const chunk of stream) {
          if (firstChunk) {
            firstChunk = false;

            logger.info("Stream connected", {
              firstChunkMs: Date.now() - startedAt,
            });
          }

          const delta = chunk.choices[0]?.delta;

          // 推理模型先把思考过程放在 reasoning_content 里，
          // 这段期间 content 是空的，不打印出来会像卡死
          const reasoning = (
            delta as
              | Record<string, unknown>
              | undefined
          )?.["reasoning_content"];

          if (
            typeof reasoning === "string" &&
            reasoning
          ) {
            process.stdout.write(
              `\x1b[90m${reasoning}\x1b[0m`,
            );
          }

          const piece = delta?.content;

          if (piece) {
            streamed = true;
            content += piece;
            process.stdout.write(piece);
          }

          // finish_reason 只在最后一个 chunk 里出现，
          // 值为 length 说明被长度上限截断了
          const chunkFinishReason =
            chunk.choices[0]?.finish_reason;

          if (chunkFinishReason) {
            finishReason = chunkFinishReason;
          }

          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens =
              chunk.usage.completion_tokens;
            totalTokens = chunk.usage.total_tokens;
          }
        }

        const result: LLMResponse = {
          content,
          finishReason,
          promptTokens,
          completionTokens,
          totalTokens,
        };

        logger.info("LLM request completed", {
          finishReason: result.finishReason,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.totalTokens,
        });

        return result;
      } catch (error) {
        lastError = error;

        logger.error(
          `LLM request failed. attempt=${attempt}/${maxRetries}`,
          error,
        );

        // 已经输出过内容就不能重试，避免重复打印
        if (streamed) {
          break;
        }

        if (attempt < maxRetries) {
          const delayMs = attempt * 1000;

          logger.info(
            `Retrying after ${delayMs}ms`,
          );

          await this.sleep(delayMs);
        }
      }
    }

    throw new Error(
      `LLM request failed after ${maxRetries} attempts.`,
      {
        cause: lastError,
      },
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}