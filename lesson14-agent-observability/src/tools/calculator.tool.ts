import { z } from 'zod';

export const calculatorSchema = z.object({
  expression: z.string().min(1),
});

export type CalculatorInput = z.infer<typeof calculatorSchema>;

export async function calculator(input: CalculatorInput): Promise<number> {
  const expression = input.expression;

  if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
    throw new Error('表达式包含非法字符');
  }

  /**
   * 仅用于课程演示。
   *
   * 生产环境不要直接执行用户输入。
   */

  const result = Function(`"use strict"; return (${expression})`)();

  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('计算结果无效');
  }

  return result;
}
