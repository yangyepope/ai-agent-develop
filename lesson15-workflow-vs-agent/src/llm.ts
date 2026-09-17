import 'dotenv/config';

import OpenAI from 'openai';

import { config } from './config.js';

const apiKey = process.env.LLM_API_KEY;

if (!apiKey) {
  throw new Error('缺少 LLM_API_KEY');
}

export const llmClient = new OpenAI({
  apiKey,
  baseURL: process.env.LLM_BASE_URL,
});

export const llmModel = config.llm.model;
