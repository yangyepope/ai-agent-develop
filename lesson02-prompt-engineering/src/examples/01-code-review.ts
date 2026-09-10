import { llmClient } from "../llm.ts";
import { config } from "../config.ts";
import { codeReviewSystemPrompt } from "../prompts/code-review.prompt.ts";

const javaCode = `
public User getUser(Long id) {
    return userMapper.selectById(id);
}
`.trim();

console.log(javaCode)

async function main(): Promise<void> {
  const response = await llmClient.chat.completions.create({
    model: config.llm.model,

    messages: [
      {
        role: "system",
        content: codeReviewSystemPrompt,
      },
      {
        role: "user",
        content: `
请 Review 以下 Java 代码：

${javaCode}
        `.trim(),
      },
    ],
  });

  console.log(response.choices[0]?.message?.content ?? '');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});