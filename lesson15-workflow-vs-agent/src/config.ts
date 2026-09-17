import 'dotenv/config';

export const config = {
  llm: {
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  },

  agent: {
    maxIterations: 5,
  },

  workflow: {
    stopOnError: true,
  },
};
