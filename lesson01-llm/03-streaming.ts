/**
 * 练习 3：流式输出（Streaming）
 *
 * 运行：npm start lesson01-llm/03-streaming.ts
 *
 * 对应知识点：Streaming
 *
 * 为什么要流式？非流式要等模型把整段话生成完才返回，用户盯着空屏幕等好几秒。
 * 流式是边生成边推送，体验完全不同。另外 max_tokens 开得很大时，
 * 非流式请求容易撞上 HTTP 超时。
 */
import {
  createClient,
  resolveModel,
  runExample,
} from '../lesson02-prompt-engineering/src/index.ts';

await runExample(async () => {
  const client = createClient();

  const stream = await client.chat.completions.create({
    model: resolveModel(),
    max_tokens: 2048,
    messages: [
      { role: 'user', content: '讲一个 100 字左右的小故事，主角是一个学写代码的机器人。' },
    ],
    stream: true, // ← 只加这一个参数，返回值就从 completion 变成异步迭代器
    stream_options: { include_usage: true }, // 让最后一个 chunk 带上 usage
  });

  console.log('=== 流式输出开始 ===');

  let usage: { prompt_tokens: number; completion_tokens: number } | undefined;

  for await (const chunk of stream) {
    // 增量文本在 delta.content，可能是 undefined（比如最后一个统计 chunk）
    const piece = chunk.choices[0]?.delta.content;
    if (piece !== undefined && piece !== null) {
      process.stdout.write(piece); // 用 write 而不是 log，避免每块换行
    }
    if (chunk.usage) {
      usage = chunk.usage;
    }
  }

  console.log('\n=== 流式输出结束 ===');

  if (usage) {
    console.log(`\n输入 ${usage.prompt_tokens} token，输出 ${usage.completion_tokens} token`);
  }
});
