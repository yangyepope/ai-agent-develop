import { llmClient } from "../llm.js";
import { config } from "../config.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function main(): Promise<void> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "你是一名 Java 后端专家。",
    },
  ];

  messages.push({
    role: "user",
    content: "我正在学习 Redis。",
  });

  const firstResponse = await llmClient.chat.completions.create({
    model: config.llm.model,
    messages,
  });

  const firstAnswer =
    firstResponse.choices[0]?.message?.content ?? "";

  console.log("第一次回答：");
  console.log(firstAnswer);

  messages.push({
    role: "assistant",
    content: firstAnswer,
  });

  messages.push({
    role: "user",
    content: "那它和 MySQL 有什么区别？",
  });

  const secondResponse = await llmClient.chat.completions.create({
    model: config.llm.model,
    messages,
  });

  const secondAnswer =
    secondResponse.choices[0]?.message?.content ?? "";

  console.log("\n第二次回答：");
  console.log("======================================================================")
  console.log(secondAnswer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});