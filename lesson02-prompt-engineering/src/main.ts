import { llmClient } from './llm.ts';
import { config } from './config.ts';
import { basicSystemPrompt } from "./prompts/basic.prompt.ts";

async function main(): Promise<void> {
  const response = await llmClient.chat.completions.create({
    model: config.llm.model,

    messages: [
      {
        role: "system",
        content: basicSystemPrompt
      },
      {
        role: "user",
        content: "请介绍一下 Redis，输出不要超过1000字",
      },
    ],
  });

  
  console.log(response.choices[0]?.message?.content ?? '');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});