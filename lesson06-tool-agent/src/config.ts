import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

/*
 * 读取一个"可选的正整数"环境变量。
 *
 * 与 requireEnv 的区别：缺失时不算错误，直接返回 fallback。
 * 但一旦提供了值，就必须是正整数 —— 宁可启动时直接报错，
 * 也不要让 NaN / 0 / 负数悄悄传进 AgentLoop，
 * 导致循环次数失控或者一步都不执行。
 */
function optionalPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} 必须是正整数，当前值：${raw}`);
  }

  return value;
}

export const config = {
  llm: {
    apiKey: requireEnv('LLM_API_KEY'),

    baseURL: requireEnv('LLM_BASE_URL'),

    model: requireEnv('LLM_MODEL'),
  },

  agent: {
    /*
     * 单次任务允许的最大执行步数，一次 LLM 决策算一步。
     *
     * 它是"安全阀"而不是业务参数：LLM 有可能陷入
     * 「思考 → 调工具 → 再思考」的循环，
     * 不设上限就会一直烧 Token，任务也永远不会结束。
     *
     * 默认 10 够覆盖绝大多数单任务场景；
     * 需要多轮工具编排时可以调大，
     * 调试失败路径时可以调小，让它更快触顶。
     */
    maxSteps: optionalPositiveIntEnv('AGENT_MAX_STEPS', 10),
    maxToolCalls: optionalPositiveIntEnv('AGENT_MAX_TOOL_CALLS', 10),
  },
};
