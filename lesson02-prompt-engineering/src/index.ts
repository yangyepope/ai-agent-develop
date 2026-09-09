/**
 * 公共模块的统一出口，方便练习文件一行导入。
 *
 * 刻意不在这里导出 config.ts / llm.ts —— 它们在模块顶层就读环境变量、建客户端，
 * 挂进来会让任何 import 本文件的代码在加载时就可能抛错。需要它们的地方直接单独 import。
 */
export { createClient, resolveBaseURL, resolveModel } from './client.ts';
export { optionalEnv, requireEnv } from './env.ts';
export { collectText, runExample } from './run.ts';
