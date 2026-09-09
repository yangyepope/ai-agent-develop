/**
 * 练习 1：最小的一次 LLM 调用
 *
 * 运行：npm start lesson01-llm/01-hello.ts
 *
 * 对应知识点：LLM / API / Model / Message / User / Max Tokens / Token
 */
import { collectText, createClient, resolveModel, runExample } from '../src/index.ts';

await runExample(async () => {
  const client = createClient();

  // chat.completions.create 就是那个「API」：一次请求，一次完整回复
  const completion = await client.chat.completions.create({
    model: resolveModel(), // 用哪个模型
    max_tokens: 1024, // 输出长度上限（单位是 token，不是字符）
    messages: [
      // 对话由一个个 Message 组成
      { role: 'user', content: '用一句话解释什么是 AI Agent。' },
    ],
  });

  console.log('=== 模型回复 ===');
  console.log(collectText(completion));

  // usage 是每次都该看一眼的字段：它直接对应你花的钱
  console.log('\n=== 用量 ===');
  console.log(`输入 token：${completion.usage?.prompt_tokens ?? '未返回'}`);
  console.log(`输出 token：${completion.usage?.completion_tokens ?? '未返回'}`);
  // finish_reason === 'length' 说明回复被截断了，得把 max_tokens 调大
  console.log(`停止原因：${completion.choices[0]?.finish_reason ?? '未返回'}`);
});
