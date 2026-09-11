import { z } from 'zod';

import type { AgentTool } from '../types/tool.js';

/*
 * calculator —— 第06课的第一个真实 Tool。
 *
 * 它本身做的事很小（算一个表达式），但它是整条链路打通的证明：
 *
 *   lesson05：模型说 action = calculator，AgentLoop 只能把 input 回显一遍。
 *             那段"假 Observation"里没有任何数字，最后那个 56088
 *             是模型自己心算出来的，对错全凭运气。
 *
 *   lesson06：模型说 action = calculator，ToolRegistry 找到这个文件，
 *             执行 execute → 得到代码算出的数字 → 作为 Observation 回灌。
 *
 * 差别不在"能不能算出来"，而在于结果由谁负责：
 * 从"模型的猜测"变成了"代码的确定性结果"。
 */

/*
 * 参数 schema，定义"调用 calculator 时必须提供什么"。
 *
 * 一份定义，两处使用：
 *
 *   1. 转成 JSON Schema 发给模型 → 模型知道该填 expression 字段；
 *   2. 拿到模型参数后用它校验 → 结构不对的输入在进 calculate 之前就被拦下。
 *
 * 把 expression 的规则逐段拆开：
 *
 *   z.string()        必须是字符串。
 *                     模型返回 {"expression": 123} 这种会被拦下。
 *
 *   .min(1)           长度至少为 1，也就是不能是空串。
 *                     模型偶尔会返回 {"expression": ""}，若放行，
 *                     下面会拼出 Function('return ()') 这种语法错误，
 *                     报错现场离真正的原因很远。
 *                     注意它挡不住纯空格 "   "，要更严可写 .trim().min(1)。
 *
 *   .describe('...')  这段文字会随 JSON Schema 一起发给模型，
 *                     这和给人看的 // 注释完全不同：
 *                       注释            → 只有读代码的人看得见
 *                       .describe(...)  → 模型看得见，直接影响它怎么填
 *                     末尾"例如 123 * 456"是故意给的样例，
 *                     比只写"数学表达式"更能让模型填对格式。
 *
 * 顺带一提：z.object 里的字段默认必填，所以 expression 必须传，
 * 想要可选得显式写 .optional()。
 */
const calculatorSchema = z.object({
  expression: z.string().min(1).describe('需要计算的数学表达式，例如 123 * 456'),
});

/*
 * 把表达式字符串算出数字。
 *
 * 这里的输入来自模型，所以它首先是不可信数据，而不是"参数"。
 * 函数里三道校验的顺序是有讲究的：先看字符合不合法，
 * 再执行，最后看结果正不正常。
 */
function calculate(expression: string): number {
  /*
   * 第一道防线：字符白名单。
   *
   * 本课程为了学习 Tool Calling，
   * 使用简单数学表达式演示。
   *
   * 生产环境不要直接对用户输入
   * 使用 eval。
   *
   * 正则只放行数字、四则运算符、括号和空白，
   * 也就是说字母、引号、分号、下划线一律拒绝 ——
   * 这挡住了绝大多数注入尝试（比如 "1; process.exit()"）。
   *
   * 为什么要放在最前面：紧接着就要执行这段文本，
   * 校验必须发生在执行之前，中间不留其它操作。
   */
  if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
    throw new Error('表达式包含不允许的字符');
  }

  /*
   * 第二道防线：把表达式当代码执行。
   *
   * 用 Function 而不是 eval，有两个好处：
   *
   *   1. Function 里创建的代码运行在全局作用域，
   *      看不到当前函数的局部变量（配置对象、闭包里的 apiKey 等），
   *      而 eval 可以直接读写作用域内的任何东西。
   *
   *   2. "动态执行"这件事在代码里一眼可见，审查时不容易漏掉；
   *      eval 则很容易被藏在某个表达式中被忽略。
   *
   * 开头的 "use strict" 启用严格模式：禁止隐式创建全局变量、
   * 禁止静默失败的赋值，让异常行为在出错的位置就暴露出来。
   *
   * 外面包一层括号 (${expression})，是把它固定在"表达式"的语法位置：
   * 否则像 {a:1} 这样的输入会被解析成语句块而不是对象，语义就变了。
   *
   * 再强调一次：这不是沙箱。Function 依然能访问全局对象
   * （globalThis / process 等），真正守住底线的是上面那道字符白名单。
   */
  const result = Function(`"use strict"; return (${expression})`)();

  /*
   * 第三道：检查结果是不是"一个正常的数"。
   *
   * 白名单挡住了非法字符，但合法字符也能算出异常值：
   *
   *   "1/0"      → Infinity
   *   "0/0"      → NaN
   *   "1e400"    → Infinity
   *
   * typeof 检查则拦另一种情况：表达式返回了非数字，
   * 比如 "(void 0)" 得到的是 undefined。
   *
   * 这些值一旦被转成字符串（"Infinity" / "NaN"）回灌给模型，
   * 模型只会照着它继续往下编，所以宁可在这里就失败。
   */
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('无法得到有效计算结果');
  }

  return result;
}

/*
 * 工具的最终形态：交给注册表的条目。
 *
 * 泛型参数写的是 typeof calculatorSchema，而不是
 * AgentTool<z.ZodTypeAny> 这类宽泛写法 ——
 * 只有这样，execute 里的 input 才能被推导成 { expression: string }。
 */
export const calculatorTool: AgentTool<typeof calculatorSchema> = {
  /*
   * 工具名。它就是模型在 JSON 里回传的 action 值，
   * 必须与注册表里的 key 完全一致 —— 差一个字母，模型就永远调不到它。
   */
  name: 'calculator',

  /*
   * 工具说明，这段文字会发给模型，决定它"什么时候会想起用这个工具"。
   *
   * 这里写的是使用场景（加减乘除、括号表达式），而不是只写"计算器"——
   * 说明越明确，模型越少出现"该用工具却自己心算"的情况。
   */
  description: '执行数学计算。适用于加减乘除和括号等数学表达式。',

  /*
   * 把上面那份 schema 交出去：既作为"说明书"发给模型，
   * 也用于运行时校验模型返回的参数。
   */
  schema: calculatorSchema,

  /*
   * 真正执行的地方。
   *
   * input 的类型来自 schema 推导，所以这里可以安全地写
   * input.expression（拼错字段名编译器会直接报错）。
   *
   * 前提是调用方（第06课的 ToolRegistry）已经用 schema 校验过
   * 模型返回的参数。如果没校验，这个类型只是"编译器愿意相信"，
   * 运行时字段仍可能是 undefined。
   *
   * 第二个参数写成 _context，下划线是约定：
   * 这个 Tool 不需要上下文，但接口要求保留这一位。
   * 签名不改是因为所有 Tool 必须长得一样，注册表才能统一调用。
   *
   * 返回 String(result)：计算结果是数字，但要拼进 messages
   * 回灌给模型，而模型只认文本 —— 转换在这一层做掉，
   * 上层就不用再关心类型了。
   */
  async execute(input, _context): Promise<string> {
    const result = calculate(input.expression);

    return String(result);
  },
};

/*
 * ── 可以再补的一条防线 ─────────────────────────────────────────
 *
 * schema 目前只限制了"非空"，没限制长度。理论上模型（或被注入的
 * 上下文内容）可以生成一个几万字符的表达式交给 Function 执行，
 * 白白占满 CPU。
 *
 * 演示场景无所谓，要收紧的话给字段加上限：
 *
 *   z.string().min(1).max(200).describe(...)
 *
 * max 同样会变成 JSON Schema 里的 maxLength 发给模型，
 * 属于"声明式的限制"：模型看得到，运行时也真的会拦。
 */
