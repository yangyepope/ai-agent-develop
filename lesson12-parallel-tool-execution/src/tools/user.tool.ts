import { z } from 'zod';
import type { Tool } from '../types/tool.js';

const userSchema = z.object({
  userId: z.string().min(1),
});

const users = {
  '1001': {
    id: '1001',
    name: '张三',
    email: 'zhangsan@example.com',
  },

  '1002': {
    id: '1002',
    name: '李四',
    email: 'lisi@example.com',
  },
};

export const userTool: Tool<typeof userSchema> = {
  name: 'get_user',

  description: '根据用户 ID 查询用户信息',

  schema: userSchema,

  async execute(input) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const user = users[input.userId as keyof typeof users];

    if (!user) {
      throw new Error(`用户不存在：${input.userId}`);
    }

    return user;
  },
};
