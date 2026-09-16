import { z } from 'zod';
import type { Tool } from '../types/tool.js';

const weatherSchema = z.object({
  city: z.string().min(1),
});

const weatherData: Record<
  string,
  {
    temperature: number;
    weather: string;
    humidity: number;
  }
> = {
  北京: {
    temperature: 25,
    weather: '晴',
    humidity: 40,
  },

  上海: {
    temperature: 27,
    weather: '多云',
    humidity: 65,
  },

  武汉: {
    temperature: 30,
    weather: '晴',
    humidity: 55,
  },

  广州: {
    temperature: 32,
    weather: '雷阵雨',
    humidity: 75,
  },
};

export const weatherTool: Tool<typeof weatherSchema> = {
  name: 'weather',

  description: '查询指定城市天气',

  schema: weatherSchema,

  async execute(input) {
    const city = input.city;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const weather = weatherData[city];

    if (!weather) {
      throw new Error(`暂时没有 ${city} 的天气数据`);
    }

    return {
      city,

      ...weather,
    };
  },
};
