/**
 * 代码审查结果的数据契约（Schema）
 *
 * ===================== 这个文件解决什么问题 =====================
 *
 * 大模型返回的是「一段文本」，不是「一个对象」。
 * 你 JSON.parse 之后拿到的是 any，字段可能拼错、类型可能不对：
 *
 *   - 字段名写错    { summery: '...' }      // 应该是 summary
 *   - 类型不对      { score: '85分' }        // 应该是 number
 *   - 枚举值乱来    { level: '严重' }        // 只允许 low/medium/high
 *   - 结构缺失      { summary: '...' }       // 少了 score 和 issues
 *   - 夹带私货      "好的，以下是结果：{...}"  // JSON 外面裹了一层解释
 *
 * 这个文件用 zod 把「审查结果应该长什么样」写死成一份契约。
 * 模型返回的数据必须通过校验才能进入业务代码，否则直接抛错 ——
 * 把不确定的脏数据挡在门口，而不是让它流到下游才炸。
 *
 * ===================== z 是什么 =====================
 *
 * z 是 zod 库的导出对象，zod 是 TypeScript 生态里的 Schema 校验库。
 *
 * 它的核心价值是「一份定义，同时管两件事」：
 *
 *   1. 编译时 —— 用 z.infer 从中推导出 TS 类型，IDE 有补全、有报错
 *   2. 运行时 —— 用 .parse() 真的检查数据，不合规立刻抛错
 *
 * 普通 interface / type 只能做到第 1 点，而且编译后就被擦除了。
 * 但模型返回的数据是「运行时」才拿到的，所以必须靠 zod 这类库兜住。
 *
 * ===================== 常用 API 速查 =====================
 *
 *   z.object({...})       对象，字段逐个校验
 *   z.string()            字符串
 *   z.number()            数字
 *   z.enum([...])         枚举，值只能是列表里的某一个
 *   z.array(x)            数组，每个元素都要满足 x
 *   .min(n) / .max(n)     链式约束（数字比大小、字符串比长度）
 *
 * 官网：https://zod.dev
 */

import { z } from 'zod';

/**
 * 单个代码问题的结构
 *
 * 对应审查报告里 issues 数组中的每一项。
 */
export const CodeIssueSchema = z.object({
  /**
   * 问题类别，只允许三个值
   *
   * 为什么用 z.enum 而不是 z.string？
   * 写成 z.string() 的话，模型可能返回「漏洞」「性能问题」「security issue」
   * 这类自由发挥的文本，下游想按类别分组统计就没法做了。
   * 枚举把取值空间锁死，模型只能在给定选项里挑一个。
   */
  type: z.enum(['bug', 'performance', 'security']),

  /**
   * 严重程度，同样锁死三个档位
   *
   * 为什么不让模型直接填数字（1~5）？
   * 数字档位模型容易飘（一会儿给 3 一会儿给 4，边界不稳定），
   * 离散的 low / medium / high 更稳，也更适合直接拿来做 UI 分类展示。
   */
  level: z.enum(['low', 'medium', 'high']),

  /**
   * 问题的具体描述
   *
   * 注意：z.string() 只校验「它是个字符串」，
   * 不保证内容有意义 —— 模型完全可能返回空串。
   * 如果要求非空，写成 z.string().min(1) 即可。
   */
  message: z.string(),

  /**
   * 修改建议
   *
   * 和 message 配对使用：
   * message 说「哪里有问题」，suggestion 说「该怎么改」。
   */
  suggestion: z.string(),
});

/**
 * 整份代码审查报告的结构
 *
 * 这是对外的主 Schema，业务代码校验的就是它。
 */
export const CodeReviewSchema = z.object({
  /**
   * 总体结论
   *
   * 一段话概述这次审查的整体观感，给人看的。
   */
  summary: z.string(),

  /**
   * 代码质量评分，范围 0 ~ 100
   *
   * .min(0).max(100) 就是链式约束：
   * 模型如果返回 120 或 -1，parse 时会被直接拦下来。
   *
   * 小技巧：在 prompt 里明确写「score 必须是 0-100 的整数」，
   * 校验通过率会明显提高 ——
   * Schema 是兜底网，不是用来替代 prompt 的。
   */
  score: z.number().min(0).max(100),

  /**
   * 问题列表
   *
   * 这里直接复用上面定义的 CodeIssueSchema，
   * 数组里的每一项都会按同样的规则被校验。
   *
   * 嵌套复用是 Schema 组合的基本玩法：
   * 小 Schema 拼成大 Schema，改一处处处生效。
   */
  issues: z.array(CodeIssueSchema),
});

/**
 * 从 Schema 反推 TypeScript 类型
 *
 * z.infer<typeof X> 表示「取 X 推导出来的类型」，
 * 效果等价于下面这段手写代码（但不用你维护）：
 *
 *   export interface CodeReviewResult {
 *     summary: string;
 *     score: number;
 *     issues: {
 *       type: 'bug' | 'performance' | 'security';
 *       level: 'low' | 'medium' | 'high';
 *       message: string;
 *       suggestion: string;
 *     }[];
 *   }
 *
 * 为什么不直接手写 interface？
 * 因为「两处定义」迟早会不同步：
 * 你在 Schema 里加了个字段、忘了改 interface，两边就悄悄对不上了，
 * 而且这种错误编译器不会提醒你。
 * 用 z.infer 只有一份事实来源（single source of truth）。
 *
 * 用法：
 *
 *   const review: CodeReviewResult = CodeReviewSchema.parse(data);
 *   review.issues[0].level;   // 已经是强类型，IDE 有补全
 */
export type CodeReviewResult = z.infer<typeof CodeReviewSchema>;

/**
 * ===================== 典型用法 =====================
 *
 * 完整链路是「模型返回文本 → JSON.parse → zod 校验 → 业务使用」：
 *
 *   const response = await llmClient.chat.completions.create({ ... });
 *
 *   const text = response.choices[0]?.message?.content ?? '';
 *   const raw = JSON.parse(text);              // 此时 raw 是 any，不可信
 *   const review = CodeReviewSchema.parse(raw); // 通过了才敢用
 *
 *   console.log(review.score);
 *   review.issues.forEach((issue) => {
 *     // issue.type / issue.level 已经被收窄成联合字面量类型
 *   });
 *
 * parse 校验失败会抛出 ZodError，里面带着「哪个字段错了、错在哪」，
 * 非常适合直接回灌给模型让它重试：
 *
 *   try {
 *     return CodeReviewSchema.parse(raw);
 *   } catch (error) {
 *     // 把 error.message 拼进下一轮 prompt，让模型自己修
 *     throw error;
 *   }
 *
 * ===================== 还能更进一步：结构化输出 =====================
 *
 * zod v4 提供了 z.toJSONSchema()，可以把 Schema 转成 JSON Schema，
 * 直接传给支持结构化输出的接口：
 *
 *   response_format: {
 *     type: 'json_schema',
 *     json_schema: {
 *       name: 'CodeReview',
 *       strict: true,
 *       schema: z.toJSONSchema(CodeReviewSchema),
 *     },
 *   }
 *
 * 两种做法的区别：
 *
 *   - 只在 prompt 里说「请输出 JSON」→ 模型可能不听话，靠 zod 事后拦截
 *   - 传 JSON Schema 做结构化输出   → 模型在生成时就被约束，成功率高得多
 *
 * 两者不冲突，而是互补：
 * 结构化输出负责提高「一次就对」的概率，
 * zod 校验负责保证「进业务代码的数据一定合法」。
 */
