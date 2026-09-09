import OpenAI from 'openai';

import { requireEnv } from './env.ts';

const apiKey = requireEnv('LLM_API_KEY');
const baseURL = requireEnv('LLM_BASE_URL');
const model = requireEnv('LLM_MODEL');

console.log('DEBUG env ->', {
  apiKey: apiKey.slice(0, 8) + '...',
  baseURL,
  model,
});

const client = new OpenAI({
  apiKey,
  baseURL,
});

const response = await client.chat.completions.create({
  model,
  messages: [
    {
      role: 'system',
      content: `
你是一个信息提取助手。

请从用户输入中提取：
- name
- job
- experience_years

只返回 JSON。
      `,
    },
    {
      role: 'user',
      content: '张三，Java 后端开发，5 年经验。',
    },
  ],
});

const content = response.choices[0]?.message?.content ?? '';

console.log(content);
