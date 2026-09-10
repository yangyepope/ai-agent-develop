import { llmClient } from "../llm.ts";
import { config } from "../config.ts";

async function main(): Promise<void> {
  const response = await llmClient.chat.completions.create({
    model: config.llm.model,

    max_completion_tokens: 100,

    temperature: 0,

    messages: [
      {
        role: "system",
        content: "你是一名 Java 专家。",
      },
      {
        role: "user",
        content: "什么是 Redis？",
      },
    ],
  });

  console.log(response.choices[0]?.message?.content);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/* 
创意写作

可以适当提高：

temperature

例如：

小说
广告
故事
创意



*/