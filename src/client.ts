/**
 * 千问（阿里云百炼）客户端的统一创建入口。
 *
 * 百炼提供 OpenAI 兼容模式，所以我们用官方 `openai` 包，
 * 只是把 baseURL 指向百炼的地址。好处是：这套代码换成任何
 * OpenAI 兼容的服务（DeepSeek、Kimi、自建 vLLM）都只改 baseURL。
 */
import OpenAI from 'openai';

import { optionalEnv, requireEnv } from './env.ts';

/** 百炼 OpenAI 兼容模式地址（北京地域经典地址）。新加坡地域用 dashscope-intl。 */
export const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

/**
 * 默认模型。
 * 常用可选值：
 *   qwen-plus   — 均衡，日常首选
 *   qwen-turbo  — 最快最便宜
 *   qwen-max    — 能力最强
 *   qwen3.8-max — 新一代，支持 json_schema 严格结构化输出
 */
export const DEFAULT_MODEL = 'qwen-plus';

/** 当前使用的模型：优先取 .env 里的 APP_MODEL，否则用默认值。 */
export function resolveModel(): string {
  return optionalEnv('APP_MODEL') ?? DEFAULT_MODEL;
}

export function createClient(): OpenAI {
  // 先自己校验，是为了在 Key 缺失时给出中文提示，而不是等 SDK 抛 401
  const apiKey = requireEnv('DASHSCOPE_API_KEY');

  return new OpenAI({
    apiKey,
    baseURL: optionalEnv('DASHSCOPE_BASE_URL') ?? DEFAULT_BASE_URL,
    maxRetries: 2, // 429 / 5xx / 网络错误自动重试
    timeout: 10 * 60 * 1000, // 单位是毫秒
  });
}
