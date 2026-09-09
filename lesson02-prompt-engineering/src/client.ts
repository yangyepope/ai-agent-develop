/**
 * LLM 客户端的统一创建入口。
 *
 * 走 OpenAI 兼容模式，所以用官方 `openai` 包，只把 baseURL 指向具体厂商。
 * 环境变量刻意用与厂商无关的 LLM_* 命名 —— 以后从千问换成 DeepSeek、Kimi
 * 或自建 vLLM，只改 .env，不改代码。
 */
import OpenAI from 'openai';

import { requireEnv } from './env.ts';

/**
 * 注意：这些值都在**函数内部**读取，不在模块顶层。
 * 放顶层的话，只要 import 这个文件就会校验环境变量并可能抛错，
 * 哪怕你根本没打算创建客户端（比如只想用 collectText）。
 */

/** 当前使用的模型，来自 .env 的 LLM_MODEL。 */
export function resolveModel(): string {
  return requireEnv('LLM_MODEL');
}

/** 当前使用的接口地址，来自 .env 的 LLM_BASE_URL。 */
export function resolveBaseURL(): string {
  return requireEnv('LLM_BASE_URL');
}

export function createClient(): OpenAI {
  // 先自己校验，是为了在 Key 缺失时给出中文提示，而不是等 SDK 抛 401
  const apiKey = requireEnv('LLM_API_KEY');

  return new OpenAI({
    apiKey,
    baseURL: resolveBaseURL(),
    maxRetries: 2, // 429 / 5xx / 网络错误自动重试
    timeout: 10 * 60 * 1000, // 单位是毫秒
  });
}
