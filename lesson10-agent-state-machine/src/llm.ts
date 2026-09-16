import OpenAI from 'openai';
import 'dotenv/config';

const apiKey = process.env.LLM_API_KEY;

if (!apiKey) {
  throw new Error('缺少 LLM_API_KEY，请检查 .env 文件');
}

export const llmClient = new OpenAI({
  apiKey,
  baseURL: process.env.LLM_BASE_URL,
});
