import { z } from 'zod';
import type { Tool } from '../types/tool.js';

const calculatorSchema = z.object({
  expression: z.string().min(1),
});

export const calculatorTool: Tool<typeof calculatorSchema> = {
  name: 'calculator',

  description: '计算简单的数学表达式，例如 128 * 36',

  schema: calculatorSchema,

  async execute(input) {
    const { expression } = input;

    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error('表达式包含不允许的字符');
    }

    const result = Function(`"use strict"; return (${expression})`)();

    return {
      expression,
      result,
    };
  },
};
