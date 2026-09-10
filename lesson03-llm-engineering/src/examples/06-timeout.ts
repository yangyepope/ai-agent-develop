import { llmClient } from "../llm.ts";
import { config } from "../config.ts";

async function main(): Promise<void> {
  const response = await llmClient.chat.completions.create(
    {
      model: config.llm.model,

      messages: [
        {
          role: "user",
          content: "请介绍一下 TypeScript。",
        },
      ],
    },
    {
      timeout: 10_000,
    },
  );

  console.log(response.choices[0]?.message?.content);
}

main().catch((error) => {
  console.error("LLM request failed:", error);
  process.exit(1);
});