import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { z } from 'zod';

import { LLMService, type LLMRequestOptions } from './llm.service.js';

/** generate() 的可选配置 */
export interface StructuredRequestOptions extends LLMRequestOptions {
  /**
   * 最多尝试几次（含第一次），默认 2
   *
   * 设成 2 的意思是：首次失败后，把报错信息拼回对话让模型改一次；
   * 再失败就抛错，不再无休止重试 —— 免得既烧钱又拖慢响应。
   */
  maxAttempts?: number;

  /** 每次失败重试前的回调，方便外部打日志、做监控 */
  onRetry?: (attempt: number, error: unknown) => void;
}

export class StructuredService {
  /**
   * 注意：这里不能写成「构造器参数属性」的简写形式：
   *
   *   constructor(private llmService: LLMService) {}
   *
   * 因为 tsconfig 里开启了 erasableSyntaxOnly（为了配合 Node 24 原生执行 .ts 文件）。
   * 这种简写编译后会生成真实的字段赋值代码，属于「不可擦除」的 TS 语法，
   * 会被编译器以 TS1294 拦下。
   *
   * 所以必须老实拆成两步：先声明字段，再在构造器里赋值。
   */
  private readonly llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  /**
   * 让模型按指定 Schema 输出结构化数据
   *
   * 完整流程：
   *
   *   1. 调用 LLM 拿到文本
   *   2. 从文本里抠出 JSON（模型经常加 markdown 包裹或解释文字）
   *   3. 用 zod 校验，通过就返回强类型对象
   *   4. 失败 → 把「错在哪」拼回对话，让模型带着明确目标改一次
   *
   * 第 4 步是这套方案的关键：
   * 模型第一次输出不合规是常态，直接抛错给用户很不友好；
   * 把 ZodError 的字段级报错回灌给它，命中率会高很多。
   *
   * @param schema   验收标准，同时决定返回值的类型
   * @param messages 对话消息
   * @param options  模型参数 + 重试配置
   */
  async generate<T>(
    schema: z.ZodSchema<T>,
    messages: ChatCompletionMessageParam[],
    options: StructuredRequestOptions = {},
  ): Promise<T> {
    const { maxAttempts = 2, onRetry, ...llmOptions } = options;

    // 复制一份再改动，避免污染调用方传进来的数组
    const conversation: ChatCompletionMessageParam[] = [...messages];

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await this.llmService.chat(conversation, llmOptions);

      try {
        // 先抠 JSON 再解析：
        // 模型很爱在 JSON 外面裹一层，裸调 JSON.parse 极易直接抛 SyntaxError
        const jsonText = extractJson(response.content);

        return schema.parse(JSON.parse(jsonText));
      } catch (error) {
        lastError = error;

        if (attempt >= maxAttempts) {
          break;
        }

        onRetry?.(attempt, error);

        // 把模型这次的原始输出 + 具体报错一起塞回对话，
        // 它下一轮就有明确的修正目标，而不是盲猜着重来
        conversation.push({ role: 'assistant', content: response.content });
        conversation.push({ role: 'user', content: buildRepairPrompt(error) });
      }
    }

    throw new Error(
      `结构化输出失败：已尝试 ${maxAttempts} 次仍未通过校验。最后一次错误：${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
      { cause: lastError },
    );
  }
}

/**
 * 从模型返回的文本里抠出 JSON 字符串
 *
 * 模型的输出常见三种形态：
 *
 *   1. 纯 JSON              {"summary":"...","score":85,...}
 *   2. markdown 代码块       ```json\n{...}\n```
 *   3. 夹着解释文字          好的，以下是审查结果：{...} 希望有帮助！
 *
 * 这里逐个兼容，尽量让 JSON.parse 有东西可解。
 *
 * 注意：只处理对象（{...}），因为本课的 Schema 都是对象。
 * 如果你的 Schema 是数组，要把 {} 换成 []，或者两个都试。
 */
function extractJson(raw: string): string {
  const text = raw.trim();

  // 形态 2：```json ... ``` 或 ``` ... ```
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  // 形态 3：取第一个 { 到最后一个 } 之间的内容
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  // 形态 1，或者其他无法识别的输入：原样返回，交给 JSON.parse 去报错
  return text;
}

/**
 * 根据失败原因，生成「让模型自己修」的提示词
 *
 * 分两种情况：
 *
 *   - ZodError    → 能拿到字段级报错，逐条列出来最有效
 *   - SyntaxError → JSON 本身就不合法，给出解析错误和格式要求
 */
function buildRepairPrompt(error: unknown): string {
  const requirement =
    '要求：只输出一个合法的 JSON 对象，不要任何解释文字，不要用 markdown 代码块包裹。';

  // 情况一：JSON 合法但不符合 Schema
  if (error instanceof z.ZodError) {
    const details = error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(根对象)';

        return `- ${path}: ${issue.message}`;
      })
      .join('\n');

    return [
      '你上一次的输出未通过 Schema 校验，请修正后重新输出。',
      '',
      '校验错误：',
      details,
      '',
      requirement,
    ].join('\n');
  }

  // 情况二：压根不是合法 JSON（少了引号、多了逗号、被截断……）
  if (error instanceof SyntaxError) {
    return [
      '你上一次的输出不是合法 JSON，无法解析。',
      '',
      `解析错误：${error.message}`,
      '',
      requirement,
    ].join('\n');
  }

  // 其他意外错误：给个兜底提示
  return `你上一次的输出无法使用（${String(error)}）。请严格按照要求重新输出。`;
}
