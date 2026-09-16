import "dotenv/config";

function getRequiredEnv(
  name: string
): string {

  const value =
    process.env[name];

  if (!value) {

    throw new Error(
      `环境变量 ${name} 没有配置`
    );
  }

  return value;
}

export const config = {

  llm: {

    apiKey:
      getRequiredEnv(
        "LLM_API_KEY"
      ),

    baseURL:
      getRequiredEnv(
        "LLM_BASE_URL"
      ),

    model:
      getRequiredEnv(
        "LLM_MODEL"
      )
  },

  memory: {

    /*
     * 最近保留多少条消息。
     */
    maxMessages: 20
  },

  agent: {

    maxSteps: 8
  }

} as const;