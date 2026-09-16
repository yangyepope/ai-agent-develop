import { z } from 'zod';
import type { Tool } from '../types/tool.js';

const orderSchema = z.object({
  userId: z.string().min(1),
});

const orders = {
  '1001': [
    {
      orderId: 'ORDER-001',
      amount: 299,
      status: '已支付',
    },
    {
      orderId: 'ORDER-002',
      amount: 599,
      status: '配送中',
    },
  ],

  '1002': [
    {
      orderId: 'ORDER-003',
      amount: 199,
      status: '已完成',
    },
  ],
};

export const orderTool: Tool<typeof orderSchema> = {
  name: 'get_orders',

  description: '根据用户 ID 查询用户订单',

  schema: orderSchema,

  async execute(input) {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const userOrders = orders[input.userId as keyof typeof orders];

    if (!userOrders) {
      throw new Error(`用户 ${input.userId} 没有订单`);
    }

    return {
      userId: input.userId,

      orders: userOrders,
    };
  },
};
