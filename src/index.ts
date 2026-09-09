/** 公共模块的统一出口，方便练习文件一行导入。 */
export { createClient, DEFAULT_BASE_URL, DEFAULT_MODEL, resolveModel } from './client.ts';
export { optionalEnv, requireEnv } from './env.ts';
export { collectText, runExample } from './run.ts';
