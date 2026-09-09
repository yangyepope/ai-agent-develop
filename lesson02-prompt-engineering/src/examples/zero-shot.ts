import { llmClient } from '../llm.ts';
import { config } from '../config.ts';

const response = await llmClient.chat.completions.create({
  model: config.llm.model,
  messages: [
    {
      role: 'user',
      content: `
请判断下面这句话是正面、负面还是中性：


"这个手机的性能不错，但是价格有点贵。"

只返回：
正面
负面
中性

不要输出其他内容。
      `.trim(),
    },
  ],
});

console.log(response.choices[0]?.message?.content ?? '');
