import 'dotenv/config';

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const config = {
  llm: {
    apiKey: getEnv('LLM_API_KEY'),
    baseURL: getEnv('LLM_BASE_URL'),
    model: getEnv('LLM_MODEL'),
  },
};
