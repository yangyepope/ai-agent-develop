import { llmClient } from "../llm.ts";
import { config } from "../config.ts";

async function main(): Promise<void> {
  const response = await llmClient.chat.completions.create({
    model: config.llm.model,

    messages: [
      {
        role: "system",
        content: "你是一名 AI 工程师。",
      },
      {
        role: "user",
        content: "解释一下什么是 Agent Loop。",
      },
    ],
  });

  console.log("模型输出：");
  console.log(response.choices[0]?.message?.content);

  console.log("\nToken Usage：");

  console.log({
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});