import type { AgentTool } from '../types/agent.js';

export const weatherTool: AgentTool = {
  name: 'weather',

  description: '查询指定城市的天气',

  async execute(arguments_) {
    const city = arguments_.city;

    if (typeof city !== 'string') {
      throw new Error('city 必须是字符串');
    }

    await sleep(300);

    const weatherMap: Record<string, string> = {
      北京: '晴天，25°C',
      上海: '多云，27°C',
      武汉: '小雨，23°C',
      广州: '晴天，30°C',
    };

    return weatherMap[city] ?? `${city}：暂无天气数据`;
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
