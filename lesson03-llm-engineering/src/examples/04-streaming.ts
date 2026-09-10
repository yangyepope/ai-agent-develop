import { llmClient } from "../llm.ts";
import { config } from "../config.ts";

async function main(): Promise<void> {
  const stream = await llmClient.chat.completions.create({
    model: config.llm.model,

    stream: true,

    messages: [
      {
        role: "system",
        content: "你是一名 AI 教程老师。",
      },
      {
        role: "user",
        content: "请详细解释什么是 AI Agent。",
      },
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;

    if (content) {
      process.stdout.write(content);
    }
  }

  process.stdout.write("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});