# 多轮会话与 token 计费

记录 `src/examples/09-java-code-assistant.ts` 实践过程中踩到的坑和结论。
所有数据都是在 `qwen3.8-27b` 上实测出来的，不是推测。

---

## 一、流式输出看起来"卡死"

**现象**：终端只打印了 `[INFO] Starting LLM request`，然后长时间一片空白。

**原因**：推理模型会先输出「思考过程」，再输出「正文」，两者放在不同字段里。

| 字段 | 内容 |
| --- | --- |
| `delta.reasoning_content` | 思考过程 |
| `delta.content` | 正文 |

只监听 `delta.content` 时，思考那段时间一直是空的，看起来就像卡死。

**处理**：`llm.service.ts` 的流式循环里同时读取 `reasoning_content`，用灰色打印出来，和正文区分：

```ts
const reasoning = (
  delta as Record<string, unknown> | undefined
)?.["reasoning_content"];

if (typeof reasoning === "string" && reasoning) {
  process.stdout.write(`\x1b[90m${reasoning}\x1b[0m`);
}
```

另外加了一条 `Stream connected { firstChunkMs }` 日志，用来观察首字节延迟（TTFT）。
如果首字节就要几十秒，那是长 prompt + 推理模型的正常表现。

---

## 二、`max_tokens` 和 `max_completion_tokens` 不是一回事

这是最容易踩的坑。同一段"写 600 字散文"的请求，实测结果：

| 传的参数 | finish_reason | 正文字数 | completion_tokens | 其中 reasoning_tokens |
| --- | --- | --- | --- | --- |
| `max_tokens: 20` | `length` | 32 | **107** | 84 |
| `max_completion_tokens: 20` | `length` | 0 | **20** | 20 |

结论：

- **`max_tokens` 只限制正文，思考 token 完全不受约束**。你给 20，服务端照样吐 107 个 —— 84 个思考 + 23 个正文。这就是"参数明明设了却像没生效"的根源。
- **`max_completion_tokens` 限制总量**（思考 + 正文）。给 20，思考就用掉 20，正文一个字都没有。

本工程统一使用 `max_completion_tokens`：

```ts
...(maxTokens !== undefined
  ? { max_completion_tokens: maxTokens }
  : {}),
```

> 背景：OpenAI 从 o1 系列开始引入 `max_completion_tokens` 来取代 `max_tokens`，
> 原因就是推理 token 也应该算进预算里。

---

## 三、参数优先级：三层覆盖

同一个参数可以在三个地方设置，**只有最高优先级那层生效**（是覆盖，不是叠加）：

| 优先级 | 位置 | 说明 |
| --- | --- | --- |
| 1（最高） | `turns[i].options` | 单轮覆盖 |
| 2 | `Conversation` 构造函数的 options | 会话默认值 |
| 3（最低） | `chat()` 里的解构默认值 | 仅当调用方完全不传该字段时才生效 |

合并逻辑在 `conversation.service.ts`：

```ts
const response = await this.llmService.chat(
  this.messages,
  {
    ...this.options,  // 会话默认值
    ...options,       // 单轮覆盖
  },
);
```

**踩过的坑**：在 `chat()` 里写 `maxTokens = 1000` 是没用的 —— `Conversation` 每次都会显式传值，这个默认值永远轮不到，属于死代码。服务层的默认值只能放在 `Conversation` 的构造参数里才有意义。

排查口诀：**谁离调用点最近谁说了算。**

---

## 四、token 是怎么算的

```
total_tokens = prompt_tokens + completion_tokens
```

| 字段 | 含义 | 受 `maxTokens` 约束吗 |
| --- | --- | --- |
| `prompt_tokens` | 发过去的输入（system + 历史 + 本轮提问） | ❌ 不受约束 |
| `completion_tokens` | 模型生成的内容 | ✅ 最多 `maxTokens` |
| `total_tokens` | 两者之和 | ❌ 可以远超 `maxTokens` |

实测一例：

```
[本轮 token] prompt=909 completion=3000 total=3909 finish=length
```

设了 3000，total 却是 3909 —— 完全正常，因为 3000 只管输出那部分。

**`maxTokens` 是"每次请求"的额度，不是"整场会话"的总额度。** 三轮对话就是三次请求，各自独立计数，加起来最多能输出 3 × 上限。

补充一条换算：实测中文约 **1 token ≈ 1.15 个汉字**（181 汉字 = 157 completion tokens）。所以 `max_completion_tokens: 100` 大约只够写 100 个汉字，且还要和思考 token 分。

---

## 五、怎么判断回答被截断

看 `finish_reason`（已加进 `LLMResponse.finishReason`）：

| 现象 | 含义 |
| --- | --- |
| `completion=3000, finish=length` | ✅ 上限生效，回答被截断，**内容不完整** |
| `completion=1500, finish=stop` | ✅ 上限也生效，只是模型自然写完了，没顶到上限 |
| `completion=5000, finish=stop` | ❌ 上限没生效，服务端忽略了参数 |

注意第二行：模型写完就停，实际输出比上限短，很容易被误判成"参数没用"。只有第三行才是真的没生效。

**被截断的回答照样会存进 `messages`**，下一轮模型看到的是半截内容，会连带影响后续几轮的质量。

---

## 六、多轮对话的成本是累积增长的

关键点：**`prompt` 不是"这一轮新加的内容"，而是每轮把 `messages` 里的全部历史重新发一遍。**

```
第 1 轮  prompt = system + 代码                              ≈ 2000
第 2 轮  prompt = system + 代码 + 第1轮回答 + 新问题          ≈ 5000
第 3 轮  prompt = 上面全部 + 第2轮回答 + 新问题               ≈ 8000
```

按每轮输出都顶格估算：

| 轮次 | prompt | completion | 小计 |
| --- | --- | --- | --- |
| 1 | 909 | 3000 | 3909 |
| 2 | ~3919 | 3000 | 6919 |
| 3 | ~6929 | 1000 | 7929 |
| **合计** | | | **~18757** |

设了一个 3000，总消耗接近 2 万 —— 因为每轮都要重新计费 prompt，而且 prompt 越滚越大。

想控制整场会话的成本，`maxTokens` 帮不上忙，只能从**轮数**和**历史长度**下手（裁剪旧消息、做摘要）。

---

## 七、上下文窗口

真正的"总上限"是模型的**上下文窗口**，通常是 32k / 128k 这个量级，约束的是 `prompt + completion` 的总和。

多轮会话里 prompt 一直累积，早晚会撞到窗口，报错大致是：

```
This model's maximum context length is 32768 tokens.
However, your messages resulted in 35000 tokens.
```

到那时的解法：只保留最近 N 轮历史，或把老对话做摘要压缩。

---

## 八、快速排查清单

| 现象 | 先查这里 |
| --- | --- |
| 流式半天没输出 | 是不是推理模型的思考阶段？看 `reasoning_content` |
| 设了 `maxTokens` 没反应 | 是不是被上层覆盖了？（看第三节优先级） |
| 输出比上限长 | 用的是 `max_tokens` 还是 `max_completion_tokens`？ |
| total 超过 maxTokens | 正常，`maxTokens` 只管 `completion` |
| 回答写一半断了 | `finish_reason` 是不是 `length`？调大上限 |
| 第二轮突然变贵 | 历史累积，prompt 重发 |

---

## 相关代码

| 文件 | 负责什么 |
| --- | --- |
| `src/services/llm.service.ts` | 发请求、流式消费、打印思考、返回 `finishReason` 与 usage |
| `src/services/conversation.service.ts` | 持有 `messages` 历史，`ask()` 追加 user / assistant |
| `src/examples/09-java-code-assistant.ts` | 三轮追问示例，验证历史是否生效 |

运行：

```bash
npm start -- src/examples/09-java-code-assistant.ts
```
