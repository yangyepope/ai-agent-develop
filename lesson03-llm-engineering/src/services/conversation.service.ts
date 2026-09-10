import type {
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
} from "./llm.service.ts";
import { LLMService } from "./llm.service.ts";

/**
 * 多轮会话。
 *
 * 模型本身没有记忆，"记得上文"全靠每次把完整历史重新发过去。
 * 所以这里最核心的一件事就是：把 messages 数组保存下来，
 * 每轮把 user 提问和 assistant 回答依次追加进去。
 */
export class Conversation {
  /**
   * 完整对话历史。
   *
   * 结构：system → user → assistant → user → assistant → ...
   */
  readonly messages: LLMMessage[] = [];

  private readonly llmService: LLMService;

  private readonly options: LLMRequestOptions;

  constructor(
    systemPrompt: string,
    options: LLMRequestOptions = {},
    llmService: LLMService = new LLMService(),
  ) {
    this.llmService = llmService;
    this.options = options;

    this.messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  /**
   * 发起一轮提问。
   *
   * 顺序：追加 user 消息 → 带上完整历史请求模型 → 追加 assistant 消息。
   * 第二轮及以后能接上上一轮的话，就是因为 messages 里带着历史。
   */
  async ask(
    userInput: string,
    options: LLMRequestOptions = {},
  ): Promise<LLMResponse> {
    this.messages.push({
      role: "user",
      content: userInput,
    });

    try {
      const response = await this.llmService.chat(
        this.messages,
        {
          ...this.options,
          ...options,
        },
      );

      this.messages.push({
        role: "assistant",
        content: response.content,
      });

      return response;
    } catch (error) {
      // 请求失败就把本轮提问撤回，避免历史里出现连着两条 user
      this.messages.pop();

      throw error;
    }
  }

  /** 打印 messages 的结构，用来观察历史是怎么一轮轮累积的 */
  printHistory(): void {
    const lastIndex = this.messages.length - 1;

    const lines = this.messages.map((message, index) => {
      const branch = index === lastIndex ? "└──" : "├──";

      const length =
        typeof message.content === "string"
          ? message.content.length
          : 0;

      return `${branch} ${message.role.padEnd(9)} ${length} 字`;
    });

    console.log(["messages", "│", ...lines].join("\n"));
  }
}
