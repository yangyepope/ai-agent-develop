import { llmClient } from "../llm.ts";
import { config } from "../config.ts";

const response = await llmClient.chat.completions.create({
  model: config.llm.model,

  messages: [
    {
      role: "system",
      content: `
你是一个文本情感分类助手。

你只能输出：
正面
负面
中性
      `.trim(),
    },

    {
      role: "user",
      content: "这个产品太棒了，我非常喜欢。",
    },

    {
      role: "assistant",
      content: "正面",
    },

    {
      role: "user",
      content: "这个产品非常差，我后悔购买。",
    },

    {
      role: "assistant",
      content: "负面",
    },

    {
      role: "user",
      content: "这个产品还可以，没有特别惊喜。",
    },
  ],
});

console.log(response.choices[0]?.message?.content ?? '');