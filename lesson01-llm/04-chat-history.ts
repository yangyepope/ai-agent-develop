/**
 * 练习 4：多轮对话与 Chat History
 *
 * 运行：npm start lesson01-llm/04-chat-history.ts
 *
 * 对应知识点：Chat History / Assistant / Context Window
 *
 * 核心事实：**接口是无状态的**。服务端不记得你上一轮说了什么。
 * 所谓「多轮对话」，完全是客户端把历史消息重新发一遍造出来的。
 * 所以历史越长，每轮的输入 token 越多 —— 这既是成本，也是
 * Context Window（上下文窗口）的上限所在。
 */
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import {
  collectText,
  createClient,
  resolveModel,
  runExample,
} from '../lesson02-prompt-engineering/src/index.ts';

await runExample(async () => {
  const client = createClient();
  const model = resolveModel();

  // 用 SDK 自带的类型，不要自己定义 { role: string; content: string }
  const history: ChatCompletionMessageParam[] = [];

  const turns = [
    '我叫小李，正在用 TypeScript 学 AI Agent。',
    '我刚才说我叫什么？用什么语言？',
    '基于这个背景，给我一条最实用的学习建议。',
  ];

  for (const userInput of turns) {
    history.push({ role: 'user', content: userInput });

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages: history, // 每一轮都把完整历史发过去
    });

    const reply = collectText(completion);

    // 关键一步：把模型的回复也塞回历史，下一轮它才「记得」自己说过什么
    history.push({ role: 'assistant', content: reply });

    console.log(`\n👤 用户：${userInput}`);
    console.log(`🤖 模型：${reply}`);
    console.log(`   (本轮输入 ${completion.usage?.prompt_tokens ?? 0} token —— 注意它在逐轮变大)`);
  }

  console.log(`\n最终历史长度：${history.length} 条消息`);
});
