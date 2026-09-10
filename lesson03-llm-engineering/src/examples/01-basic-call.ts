import { llmClient } from "../llm.ts";
import { config } from "../config.ts";

async function main(): Promise<void> {
  const response = await llmClient.chat.completions.create({
    model: config.llm.model,

    messages: [
      {
        role: "system",
        content: "你是一名专业的 AI 助手。",
      },
      {
        role: "user",
        content: "请用简单的语言解释什么是 AI Agent。",
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  console.log(content);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});