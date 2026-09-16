import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { llmClient } from '../llm.js';

import { config } from '../config.js';

import { AGENT_SYSTEM_PROMPT } from '../prompts/agent.prompt.js';

import type { AgentMessage } from '../types/message.js';

/*
 * Agent —— 与 LLM 通信的薄包装层。
 *
 * 它不"懂"任务逻辑、不"懂"工具、不"懂"记忆；
 * 这些事分别由 AgentLoop（编排）、ToolRegistry（工具注册）、
 * MemoryManager（记忆管理）各管一摊。
 *
 * Agent 只做一件事：把项目内部的 AgentMessage[] 翻译成
 * OpenAI SDK 想要的 ChatCompletionMessageParam[]，在最前面
 * 拼上 system 提示，然后发出去。
 *
 * 相对于 lesson06 的简化：
 *
 *   - 不再维护 ToolRegistry，也不再预编译 tools 列表；
 *   - 不再把 assistant 的 tool_calls 一并发回 SDK
 *     （本课的 AgentMessage 上根本就没有这个字段）。
 *
 * lesson07 的主题是"短期记忆"，工具调用让位给主线，
 * 这里的 Agent 是经过精简的版本 —— 同样的结构会随着课程
 * 推进再长回来。lesson06 的 Agent 那一版仍在 lesson06 仓库里可对照。
 */

export class Agent {
  /*
   * 同步给 LLM：把项目内部的消息序列翻译成 OpenAI 协议，
   * 然后发请求拿响应。
   *
   * 这里不存任何状态：每次调用都是"无状态的转发"。
   * Agent 不知道自己处在哪一步、上一次调了什么，
   * 全部上下文由调用方从 AgentState.messages 里装好传进来。
   *
   * 为什么不让 Agent 自己管状态？那样会和 AgentLoop 的职责重叠，
   * 也会让"哪一段负责往 messages 里加东西"变得含糊。
   * 把消息的全部权留在 AgentLoop 一处，是 lesson05 / 06 一脉的约定。
   */
  async runLLM(messages: AgentMessage[]) {
    /*
     * AgentMessage 是项目自己定义的、跨会话可序列化的消息形状；
     * ChatCompletionMessageParam 是 OpenAI SDK 当次请求的形状。
     * 两边长得不一样，所以要逐一翻译：
     *
     *   - role    两边的枚举值一一对应，直接传。
     *
     *   - content 两边都有，直接传。
     *
     *   - toolCallId / name
     *            只在 role === 'tool' 时用得到，用条件展开
     *            "只设需要的字段"，不传 undefined / null 之类。
     *            OpenAI 对多出来的键比较挑剔 —— 哪怕值是 undefined，
     *            某些版本会触发校验失败。
     *
     *            lesson07 当前不会触发这段分支（没有工具调用就不会
     *            出现 'tool' 角色消息），保留是出于类型完整性与
     *            后续扩展的考虑。
     *
     * 末尾的 `as ChatCompletionMessageParam` 是 type assertion：
     * 它只对编译器说话，不做任何运行时的检查 / 转换，
     * 编译后这一行会被完全擦除。
     *
     * 这里写它有三重用处：
     *
     *   1. 给编译器吃颗定心丸：messages.map 的回调返回类型
     *      被推成宽泛的对象，加个断言把它收回 SDK 的严格类型；
     *
     *   2. 后面把 llmMessages 当作 ChatCompletionMessageParam[]
     *      用时，IDE 才有字段补全；
     *
     *   3. 显式标明"我知道自己在做转换，出了错是我负责"，
     *      而不是悄悄塞个 any 把类型保护关掉。
     */
    const llmMessages: ChatCompletionMessageParam[] = messages.map((message) => {
      /*
       * 把 AgentMessage 翻译成 ChatCompletionMessageParam。
       *
       * 两边字段不一一对应，且 OpenAI 对"多余的键"很挑剔，
       * 所以每一个字段都要逐一考虑 —— 见下方逐行注释。
       */
      return {
        /*
         * role：两边的枚举值一一对应
         * （system / user / assistant / tool），
         *
         * 这里写成 `message.role === 'tool' ? 'tool' : message.role`
         * 看起来是个"自反"的三元表达式 —— 直接传 message.role 也编译得过。
         *
         * 多写这一句，是给阅读者一个视觉标记：
         * "这里特意考虑过 'tool' 角色的特殊性，下面会用 toolCallId / name"。
         * 行为上与直接传 message.role 完全一致，纯属风格选择。
         */
        role: message.role === 'tool' ? 'tool' : message.role,

        // content：两边都有，类型都是 string，直接传。
        content: message.content,

        /*
         * toolCallId → tool_call_id：把工具结果对上一次的 tool_calls。
         *
         * 只在 role === 'tool' 时需要。用条件展开"按需注入"：
         *   - 有值 → 展开成 { tool_call_id: 'xxx' }
         *   - 没值 → 展开成 {} （空对象），相当于这一字段"键都不存在"
         *
         * 为什么不用 `tool_call_id: message.toolCallId ?? null`？
         * 因为 OpenAI 对"多余的键"很严格 —— 把 `tool_call_id: undefined`
         * 或 `null` 一起发过去，运行时会校验失败。
         * "空对象展开"是唯一能保证"键本身都不存在"的写法。
         *
         * lesson07 当前不会触发这段分支
         * （没有工具调用 → 没有 'tool' 角色消息），
         * 保留是出于类型完整性与后续扩展的考虑。
         */
        ...(message.toolCallId
          ? {
              tool_call_id: message.toolCallId,
            }
          : {}),

        /*
         * name：与 toolCallId 同理。
         * OpenAI 用它来区分同名工具（少见），
         * 只在 'tool' 角色上有意义，同样的"按需注入"手法。
         */
        ...(message.name
          ? {
              name: message.name,
            }
          : {}),

        /*
         * 末尾的 `as ChatCompletionMessageParam` 是 type assertion：
         *
         *   - 编译后被完全擦除 —— 运行时没有检查、转换、构造；
         *   - 唯一作用是告诉 TS："相信我，这个对象符合 SDK 的契约"。
         *
         * 写它有三个实际好处：
         *
         *   1. map 回调返回的对象被 TS 推成宽泛的字面量类型，
         *      不加断言时 IDE 没有字段补全；
         *
         *   2. 让 llmMessages 的整体类型钉死为 ChatCompletionMessageParam[]，
         *      下游传给 llmClient 时不会再触发类型检查；
         *
         *   3. 显式标注"我在做协议转换，出了错我担责"，
         *      比悄悄塞个 any 关掉类型保护更安全。
         */
      } as ChatCompletionMessageParam;
    });

    /*
     * 发请求。
     *
     * OpenAI 协议要求 messages 数组的第一位是 system，
     * 用来设置角色定位与全局行为约束。
     * 这里把 AGENT_SYSTEM_PROMPT 拼在最前面，
     * 再把所有历史消息接在后面 —— 等价于让历史都在 system 的"指挥"下被解读。
     *
     * 相对于 lesson06：
     *
     *   - 没传 tools：不告诉 LLM 有什么工具可用，模型就不会尝试去调；
     *     这一课专门演示"纯对话 + 记忆"的链路，故意把工具调用从画面上拿走。
     *
     *   - 没传 tool_choice：默认 'auto' 在没有 tools 时没有意义。
     *
     * 所以这次调用拿回来的一定是一条普通文本消息（OpenAI 端
     * 不会塞 tool_calls 字段），后面对应"直接得到 final"的路径。
     */
    return llmClient.chat.completions.create({
      model: config.llm.model,

      messages: [
        {
          role: 'system',

          content: AGENT_SYSTEM_PROMPT,
        },

        ...llmMessages,
      ],
    });
  }
}