/**
 * 练习 5：让模型返回结构化 JSON
 *
 * 运行：npm start lesson01-llm/05-structured-json.ts
 *
 * 对应知识点：JSON
 *
 * 百炼有两档结构化输出：
 *   1. json_object —— 保证是**合法 JSON**，但不保证字段结构。绝大多数千问模型都支持。
 *   2. json_schema —— 保证**严格符合 schema**。只有 qwen3.7-plus / qwen3.8-max
 *      等新一代模型支持（见文末注释）。
 *
 * 本例用 json_object + Zod 客户端校验，这是兼容性最好、也最常见的生产做法：
 * API 保证语法合法，Zod 保证结构正确。
 */
import { z } from 'zod';

import {
  collectText,
  createClient,
  resolveModel,
  runExample,
} from '../lesson02-prompt-engineering/src/index.ts';

// Zod schema 同时承担三个角色：生成给模型看的 JSON Schema、运行时校验、TS 类型推导
const BugReportSchema = z.object({
  title: z.string().describe('一句话概括问题'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('严重级别'),
  component: z.string().describe('出问题的模块'),
  steps: z.array(z.string()).describe('复现步骤'),
  needsMoreInfo: z.boolean().describe('信息是否不足以定位问题'),
});

const RAW_REPORT = `我们的登录页面从昨天下午开始，用手机号登录一直转圈，
点了三四次才偶尔成功一次。用邮箱登录是好的。已经影响到大部分用户了。`;

await runExample(async () => {
  const client = createClient();

  // 把 schema 转成 JSON Schema 塞进 prompt —— 手写字段说明容易和 schema 脱节，
  // 从同一个 Zod 定义生成就不会。
  const jsonSchema = JSON.stringify(z.toJSONSchema(BugReportSchema), null, 2);

  const completion = await client.chat.completions.create({
    model: resolveModel(),
    // ⚠️ json_object 模式下不要设 max_tokens —— 一旦截断，JSON 就不完整、必然解析失败
    messages: [
      {
        role: 'system',
        // ⚠️ json_object 模式要求 prompt 里必须出现「JSON」字样，否则接口报错
        content: `你是信息抽取助手。请严格按下面的 JSON Schema 输出 JSON，不要输出任何多余文字：\n\n${jsonSchema}`,
      },
      { role: 'user', content: `把这段反馈整理成结构化的 bug 报告：\n\n${RAW_REPORT}` },
    ],
    response_format: { type: 'json_object' }, // ← 保证返回的是合法 JSON
  });

  const raw = collectText(completion);

  // 两步校验：先 JSON.parse（语法），再 Zod（结构）
  // 用 safeParse 而不是 parse，这样失败时能自己决定怎么处理，而不是直接抛异常
  const parsed = BugReportSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error('结构校验失败：');
    console.error(z.prettifyError(parsed.error));
    console.error('\n模型原始输出：\n' + raw);
    return;
  }

  // 到这里 report 已经是完全类型安全的对象，IDE 能自动补全字段
  const report = parsed.data;
  console.log('=== 结构化结果 ===');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n严重级别：${report.severity}`);
  console.log(`复现步骤共 ${report.steps.length} 步`);
});

/*
 * ── 进阶：用 json_schema 严格模式 ──────────────────────────────
 * 需要把 .env 里的 LLM_MODEL 换成支持的模型，例如 qwen3.8-max，
 * 然后把上面的 response_format 换成：
 *
 *   response_format: {
 *     type: 'json_schema',
 *     json_schema: {
 *       name: 'bug_report',
 *       strict: true,
 *       schema: z.toJSONSchema(BugReportSchema),
 *     },
 *   }
 *
 * 这样服务端就会保证结构，prompt 里也不必再贴 schema。
 * 但 Zod 校验建议保留 —— 多一层防线不亏。
 */
