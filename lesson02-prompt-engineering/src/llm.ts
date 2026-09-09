import OpenAI from 'openai';

import { config } from './config.ts';

export const llmClient = new OpenAI({
  apiKey: config.llm.apiKey,
  baseURL: config.llm.baseURL,
});
