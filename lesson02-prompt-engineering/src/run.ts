/**
 * 练习脚本的公共外壳。
 *
 * 每个练习都需要同样的三件事：捕获异常、把 SDK 的错误翻译成人话、
 * 用非 0 退出码结束。抽到这里，练习文件就能只剩业务逻辑。
 */
import OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat/completions';

/**
 * 从一条回复里取出文本。
 *
 * OpenAI 兼容格式里，回复在 choices[0].message.content。
 * 它的类型是 `string | null`，而 choices 也可能是空数组，
 * 所以不能直接写 `res.choices[0].message.content`。
 */
export function collectText(completion: ChatCompletion): string {
  return completion.choices[0]?.message.content ?? '';
}

/** 包一层错误处理再执行练习主体。 */
export async function runExample(main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (error) {
    console.error('\n❌ 运行失败：');
    console.error(describeError(error));
    process.exitCode = 1;
  }
}

function describeError(error: unknown): string {
  // 从最具体到最宽泛地判断，这样才能给出有针对性的提示
  if (error instanceof OpenAI.AuthenticationError) {
    return 'API Key 无效或已失效（401）。请检查 .env 里的 LLM_API_KEY。';
  }
  if (error instanceof OpenAI.PermissionDeniedError) {
    return '没有权限（403）。可能是该模型未开通，或 Key 所属账号无此模型权限。';
  }
  if (error instanceof OpenAI.NotFoundError) {
    return '模型或接口不存在（404）。检查 APP_MODEL 拼写，以及 baseURL 是否正确。';
  }
  if (error instanceof OpenAI.RateLimitError) {
    return '触发限流（429）。稍等一会儿再试，或降低请求频率。';
  }
  if (error instanceof OpenAI.BadRequestError) {
    return `请求参数有问题（400）：${error.message}`;
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return (
      '连不上 API。检查网络 / 代理是否正常：\n' + '  curl -sI "$LLM_BASE_URL/models" | head -1'
    );
  }
  if (error instanceof OpenAI.APIError) {
    return `API 返回错误 ${String(error.status)}：${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
