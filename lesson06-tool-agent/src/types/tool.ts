import type { z } from 'zod';

/*
 * Tool（工具）相关的类型定义。
 *
 * 一个 Tool 就是"Agent 可以调用的一个函数"，但它不是普通函数 ——
 * 它同时要对两种"读者"负责：
 *
 *   1. 对模型：模型看不到代码，它只知道 name / description /
 *      参数的 JSON Schema，靠这些信息决定"要不要调、参数怎么填"。
 *
 *   2. 对程序：真正干活的是 execute，由代码执行并返回字符串结果。
 *
 * 这两者必须来自同一份定义。如果描述和实现对不上（比如 schema 说
 * 参数叫 expression，execute 里读的却是 expr），模型填的参数就会
 * 悄悄错位，而且往往到运行时才暴露 —— 所以 schema 字段既是
 * "给模型的说明书"，也是"给自己的校验器"。
 */

/*
 * 工具执行时的上下文。
 *
 * Tool 的业务输入只有 input，但真实系统里执行一个动作往往还需要
 * 知道一些"环境信息"：属于哪个会话、当前是 Agent 的第几步。
 *
 * 之所以把它们显式当参数传进来，而不是让 Tool 自己去读全局变量：
 * 这样 Tool 才能被单独测试，也能安全地并发。
 */
export interface ToolContext {
  /* 会话标识：用于日志串联、隔离不同用户/不同任务的运行状态 */
  sessionId: string;

  /* 当前 Agent 循环走到第几步：排查"是哪一步开始出错"的关键线索 */
  step: number;
}

/*
 * AgentTool<TSchema> —— 单个工具的定义。
 *
 * 泛型 TSchema 表示"这个工具的参数 schema"，由实现方在定义工具时填入。
 * 它的价值不是"显得高级"，而是让 schema 和 execute 之间建立类型联动：
 * schema 改了，execute 里 input 的类型自动跟着变，两处不可能不同步。
 *
 * 关于 <TSchema extends z.ZodTypeAny>：
 *
 *   - TSchema 是类型占位符：定义接口时先不指定，实现时才填。
 *
 *   - extends 在这里是"约束"，不是"继承"。它要求传进来的类型
 *     必须兼容 z.ZodTypeAny（zod 里所有 schema 的公共基类型），
 *     也就是"只接受 zod schema，别的都不行"。
 *
 *   - 这个约束是下面 z.infer<TSchema> 能工作的前提：编译器得先
 *     确定 TSchema 是个 schema，才知道该怎么从它反推数据形状。
 */
export interface AgentTool<TSchema extends z.ZodTypeAny> {
  /*
   * 工具名，同时也是模型在 JSON 里回传的 action 字段值。
   *
   * 它是调度用的 key，必须全局唯一 —— 注册表（ToolRegistry）
   * 靠这个名字找到对应的实现去执行。
   *
   * 命名建议用"动词"或"动词_名词"（calculator / search_web），
   * 因为模型会直接看到这个名字来理解用途。名字起得含糊
   * （比如 do_it），模型就更容易选错工具。
   */
  name: string;

  /*
   * 工具的用途说明，会被原样发给模型。
   *
   * 注意：这段文字不是写给同事看的代码注释，而是 prompt 的一部分，
   * 它直接决定了"模型能不能在正确的时机想起这个工具"。
   *
   * 要写清两件事：能做什么、什么时候该用。例如：
   *   '计算数学表达式。只要需要精确算术就必须调用，不要自己心算。'
   *
   * 反面例子：'计算器' —— 模型不知道边界在哪，可能拿它去干别的事。
   */
  description: string;

  /*
   * 参数的 zod 定义，是"一份定义、两处使用"的枢纽：
   *
   *   1. 转成 JSON Schema 交给模型 → 模型知道该填哪些字段；
   *   2. 拿到模型返回的参数后 .parse() → 挡住结构不对的输入。
   *
   * 类型写的是 TSchema 本身，而不是宽泛的 z.ZodTypeAny。
   * 这样实现工具时，这里必须填"和泛型参数一致的那一个 schema"，
   * 不能随手塞一个别的 schema 进来 —— 那样 execute 里 input
   * 的类型就对不上了（编译器会直接报错，这是好事）。
   */
  schema: TSchema;

  /*
   * 真正执行这个工具的函数。
   *
   * z.infer<TSchema> 自动推导参数：input 的类型不是手写的，
   * 而是从上面的 schema 反推出来的。比如 schema 为
   *   z.object({ expression: z.string() })
   * 时，这里的 input 就是 { expression: string }，写错字段名立刻报错。
   *
   * 注意 input 的类型安全有个前提：调用方已经用 schema 校验过。
   * 如果没校验就直接相信模型返回的参数，那这个类型只是"编译器
   * 愿意相信"，运行时的字段仍可能是 undefined。
   *
   * 返回类型是 Promise<string> 而不是对象，取决于是谁消费这个结果：
   * 它要作为 Tool Observation 拼回 messages 喂给模型，
   * 而模型只认文本。
   *
   * 需要返回结构化数据时，在 Tool 内部 JSON.stringify 成字符串；
   * 不要为了"好看"直接返回对象，中间层还得再转一次。
   */
  execute(input: z.infer<TSchema>, context: ToolContext): Promise<string>;
}

/*
 * ── 实现一个工具是什么样子 ──────────────────────────────────────
 *
 *   const CalculatorSchema = z.object({
 *     expression: z.string().describe('要计算的数学表达式，例如 123 * 456'),
 *   });
 *
 *   export const calculatorTool: AgentTool<typeof CalculatorSchema> = {
 *     name: 'calculator',
 *     description: '计算数学表达式。需要精确算术时必须使用。',
 *     schema: CalculatorSchema,
 *
 *     async execute(input, context) {
 *       // input 自动推导为 { expression: string }
 *       console.log(`[${context.sessionId}] step ${context.step} 计算 ${input.expression}`);
 *       return String(evalExpression(input.expression));
 *     },
 *   };
 *
 * 填入 typeof CalculatorSchema 之后：
 *
 *   - schema 字段被钉死成这个 schema，填成别的会报错；
 *   - execute 的 input 自动获得精确类型；
 *   - 换个 schema 实现别的工具时，input 跟着变，无需重复声明。
 *
 * 对照上一课看会更清楚：lesson05 里 AgentLoop 拿到
 * { type: 'action', action: 'calculator', input: '123 * 456' } 之后
 * 只能把 input 原样回显 —— 因为它手里没有这张"工具清单"。
 * AgentTool 就是那张清单的条目格式，第06课的 ToolRegistry 会用它
 * 把 action 名字映射到真正的 execute 上。
 */
