import type OpenAI from "openai";

import { llmClient } from "../llm.ts";
import { config } from "../config.ts";
import { logger } from "../utils/logger.ts";

export type LLMMessage =
  OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface LLMRequestOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface LLMResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class LLMService {
  async chat(
    messages: LLMMessage[],
    options: LLMRequestOptions = {},
  ): Promise<LLMResponse> {
    const {
      temperature = 0.2,
      maxTokens,
      timeoutMs = 30_000,
      maxRetries = 3,
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info("Starting LLM request", {
          model: config.llm.model,
          attempt,
          maxRetries,
          messageCount: messages.length,
        });

        const response =
          await llmClient.chat.completions.create(
            {
              model: config.llm.model,

              messages,

              temperature,

              ...(maxTokens !== undefined
                ? {
                    max_tokens: maxTokens,
                  }
                : {}),
            },
            {
              timeout: timeoutMs,
            },
          );

        const content =
          response.choices[0]?.message?.content ?? "";

        const result: LLMResponse = {
          content,

          promptTokens:
            response.usage?.prompt_tokens ?? 0,

          completionTokens:
            response.usage?.completion_tokens ?? 0,

          totalTokens:
            response.usage?.total_tokens ?? 0,
        };

        logger.info("LLM request completed", {
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