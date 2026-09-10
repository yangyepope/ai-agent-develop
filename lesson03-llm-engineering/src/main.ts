import { LLMService } from "./services/llm.service.ts";
import { assistantSystemPrompt } from "./prompts/assistant.prompt.ts";

async function main(): Promise<void> {
  const llmService = new LLMService();

  const response = await llmService.chat([
    {
      role: "system",
      content: assistantSystemPrompt,
    },
    {
      role: "user",
      content: "什么是 AI Agent？",
    },
  ]);

  console.log("\n===== AI Response =====\n");

  console.log(response.content);

  console.log("\n===== Usage =====\n");

  console.log({
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    totalTokens: response.totalTokens,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});