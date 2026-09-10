import { LLMService } from "../services/llm.service.js";

async function main(): Promise<void> {
  const llmService = new LLMService();

  const response = await llmService.chat(
    [
      {
        role: "system",
        content: `
            你是一名资深 Java 后端工程师。

            回答要求：

            1. 使用中文。
            2. 先给结论。
            3. 再解释原因。
            4. 必要时提供代码。
        `.trim(),
      },
      {
        role: "user",
        content: "Redis 为什么比 MySQL 快？",
      },
    ],
    {
      temperature: 0.2,
      maxTokens: 1000,
      timeoutMs: 30_000,
      maxRetries: 3,
    },
  );

  console.log("\n===== LLM Response =====\n");

  console.log(response.content);

  console.log("\n===== Token Usage =====\n");

  console.log({
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    totalTokens: response.totalTokens,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});