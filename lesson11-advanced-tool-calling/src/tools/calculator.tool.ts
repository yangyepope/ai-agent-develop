import { z } from 'zod';
import type { Tool, ToolContext } from '../types/tool.js';

const calculatorSchema = z.object({
  expression: z.string().min(1, 'expression 不能为空'),
});

export const calculatorTool: Tool<typeof calculatorSchema> = {
  name: 'calculator',

  description: '执行简单数学计算，例如 1 + 2、100 * 5、200 / 4。',

  schema: calculatorSchema,

  async execute(input, context) {
    console.log(`[Calculator] requestId=${context.requestId}`);

    /**
     * 这里只允许简单数学表达式。
     *
     * 实际生产环境不要直接对用户输入
     * 使用 eval。
     *
     * 这里仅用于课程演示。
     */

    const expression = input.expression;

    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error('Calculator 只允许数字和基本数学运算符');
    }

    const result = Function(`"use strict"; return (${expression})`)();

    return {
      expression,
      result,
    };
  },
};
