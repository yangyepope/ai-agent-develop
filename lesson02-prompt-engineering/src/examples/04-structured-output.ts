import { llmClient } from "../llm.ts";
import { config } from "../config.ts";
import { structuredOutputPrompt } from "../prompts/structured-output.prompt.ts";
import type { CodeReviewResult } from "../types.ts";

async function main(): Promise<void> {
  const javaCode = `
public User getUser(Long id) {
    return userMapper.selectById(id);
}
`.trim();

  const response = await llmClient.chat.completions.create({
    model: config.llm.model,

    messages: [
      {
        role: "system",
        content: structuredOutputPrompt,
      },
      {
        role: "user",
        content: `
请分析下面的 Java 代码：

${javaCode}
        `.trim(),
      },
    ],
  });

//   const content = response.choices[0].message.content;
  const content = response.choices[0]?.message?.content ?? '';

  if (!content) {
    throw new Error("LLM returned empty content.");
  }

  const result = JSON.parse(content) as CodeReviewResult;

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});