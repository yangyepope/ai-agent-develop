import { llmClient } from "../llm.ts";
import { config } from "../config.ts";
import { sentimentSystemPrompt } from "../prompts/zero-shot.prompt.ts";

async function main(): Promise<void> {
  const userInput = "这个手机性能不错，但是价格有点贵。";

  const response = await llmClient.chat.completions.create({
    model: config.llm.model,

    messages: [
      {
        role: "system",
        content: sentimentSystemPrompt,
      },
      {
        role: "user",
        content: userInput,
      },
    ],
  });

  console.log("输入：");
  console.log(userInput);

  console.log("\n模型输出：");
//   console.log(response.choices[0].message.content);
  console.log(response.choices[0]?.message?.content ?? '');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});