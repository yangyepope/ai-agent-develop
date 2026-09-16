import 'dotenv/config';

export const config = {
  llm: {
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  },

  execution: {
    maxConcurrency: 3,

    timeoutMs: 10_000,

    failFast: false,
  },
};
