import "dotenv/config";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

export const config = {
  llm: {
    apiKey: getRequiredEnv("LLM_API_KEY"),
    baseURL: getRequiredEnv("LLM_BASE_URL"),
    model: getRequiredEnv("LLM_MODEL"),
  },
};