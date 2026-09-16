import { z } from 'zod';

import type { Tool, ToolContext } from '../types/tool.js';

const weatherSchema = z.object({
  city: z.string().min(1, 'city 不能为空'),
});

export const weatherTool: Tool<typeof weatherSchema> = {
  name: 'weather',

  description: '查询指定城市的天气信息。',

  schema: weatherSchema,

  async execute(input, context) {
    console.log(`[Weather] requestId=${context.requestId}`);

    /**
     * 当前课程不连接真实天气 API。
     *
     * 使用模拟数据演示 Tool Runtime。
     */

    const weatherMap: Record<
      string,
      {
        temperature: number;
        condition: string;
      }
    > = {
      北京: {
        temperature: 25,
        condition: '晴',
      },

      上海: {
        temperature: 27,
        condition: '多云',
      },

      武汉: {
        temperature: 29,
        condition: '晴',
      },

      广州: {
        temperature: 31,
        condition: '小雨',
      },
    };

    const weather = weatherMap[input.city] ?? {
      temperature: 24,
      condition: '天气数据暂不可用',
    };

    return {
      city: input.city,
      ...weather,
    };
  },
};
