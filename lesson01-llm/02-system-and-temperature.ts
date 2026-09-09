/**
 * 练习 2：用 System 定义模型行为，用 temperature 控制随机性
 *
 * 运行：npm start lesson01-llm/02-system-and-temperature.ts
 *
 * 对应知识点：Prompt / System / Assistant / Temperature / Max Tokens
 *
 * 注意 System 的位置：OpenAI 兼容格式里，system 是 messages 数组里
 * 的**第一条消息**（role: 'system'），不是独立字段。
 */
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { collectText, createClient, resolveModel, runExample } from '../src/index.ts';

const SYSTEM_PROMPT = `你是一位严谨的技术讲师。
回答必须满足：
1. 先给一句话结论
2. 再给不超过三条要点
3. 全程使用中文，不使用 emoji`;

const messages: ChatCompletionMessageParam[] = [
  { role: 'system', content: SYSTEM_PROMPT }, // ← System 放这里，作为第一条
  { role: 'user', content: '为什么 Agent 需要工具调用能力？' },
];

await runExample(async () => {
  const client = createClient();
  const model = resolveModel();

  // 千问支持 temperature，取值范围 0~2（OpenAI 兼容模式）
  //   接近 0：更确定、更稳定，适合抽取/分类/代码
  //   接近 1+：更多样、更有创意，适合文案/头脑风暴
  for (const temperature of [0, 1.3]) {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages,
      temperature,
    });

    console.log(`\n=== temperature = ${temperature} ===`);
    console.log(collectText(completion));
  }

  console.log('\n把同一个 temperature 多跑几次，对比两组结果的稳定程度。');
});
