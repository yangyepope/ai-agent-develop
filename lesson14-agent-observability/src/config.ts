import "dotenv/config";

export const config = {
  llm: {
    model:
      process.env.LLM_MODEL ??
      "gpt-4o-mini",
  },

  agent: {
    sessionId:
      "lesson14-session",
  },
};