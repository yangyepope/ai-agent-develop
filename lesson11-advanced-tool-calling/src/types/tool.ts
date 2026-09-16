/**
 * 工具（Tool）的统一契约 —— lesson11「高级工具调用」的类型基石。
 *
 * 本文件不含任何运行时逻辑，只定义两件事：
 *   1. ToolContext：调用工具时附带的环境信息（谁在调、哪个会话）
 *   2. Tool：一个工具长什么样（名字 / 描述 / 参数 schema / 执行函数）
 *
 * 后续所有具体工具（搜索、计算、文件读写等）都实现 Tool 接口，
 * 执行器 / Agent 只依赖这个抽象，不感知每个工具的内部实现——
 * 新增工具对 Agent 是零改动（开闭原则）。
 */
import { z } from 'zod';

/**
 * 工具调用的"环境信息"，由 Agent 在每次调用 execute 时传入。
 *
 * 用途：日志追踪、审计、权限校验、多会话隔离——
 * 工具内部不该自己去猜"这次调用来自哪"，统一从这里拿。
 */
export interface ToolContext {
  /** 当前这次 Agent 运行的请求标识，用于日志串联（一次 run 可能调多次工具）。 */
  requestId: string;

  /** 会话标识：同一个用户的多次对话共享，跨请求追踪用。 */
  sessionId: string;

  /** 自由扩展位：任何工具自定义的附加信息（如用户 ID、语言偏好等）。 */
  metadata?: Record<string, unknown>;
}

/**
 * 一个工具的完整定义。
 *
 * 泛型参数 TSchema 是 zod schema 的类型，配合 z.infer 实现
 * "参数类型由 schema 自动推导"：
 *
 *   const weatherTool: Tool<z.ZodObject<{ city: z.ZodString }>> = {
 *     schema: z.object({ city: z.string() }),
 *     async execute(input) { input.city  // ← 自动是 string，无需手写类型 },
 *   };
 *
 * 默认值 z.ZodTypeAny 表示"不锁定具体 schema 类型"——
 * 容器场景（如 tools: Tool[]）需要这种宽松形式才能装下所有工具，
 * 代价是 input 退化成 unknown，由具体工具自己负责校验/收窄。
 */
export interface Tool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  /**
   * 工具名。LLM 在 function calling 时用它来"点名"要调谁，
   * 必须全局唯一，建议用 snake_case / kebab-case 并能自解释。
   */
  name: string;

  /**
   * 工具描述。LLM 判断"什么情况下该用这个工具"的唯一依据，
   * 写得越清楚（做什么、什么时候用、什么时候不用），选工具越准。
   */
  description: string;

  /**
   * 参数的 zod schema，一鱼两吃：
   *   ① 转 JSON Schema 告诉 LLM "有哪些参数、什么类型、哪些必填"
   *   ② 执行前对 LLM 给的参数做运行时校验（LLM 给错参数是常态，必须挡）
   */
  schema: TSchema;

  /**
   * 真正的执行逻辑。
   *
   * @param input    已通过 schema 校验的参数，类型由 TSchema 推导
   * @param context  调用环境（请求/会话标识等）
   * @returns        返回给 LLM 的结果（会被序列化进对话，供模型继续推理）；
   *                 返回 unknown 是因为不同工具产物形状差异极大，
   *                 统一为"任意可序列化值"，由调用方决定如何呈现。
   */
  execute(input: z.infer<TSchema>, context: ToolContext): Promise<unknown>;
}
