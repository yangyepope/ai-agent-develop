import { z } from 'zod';

import type { Tool, ToolContext } from '../types/tool.js';

const searchSchema = z.object({
  query: z.string().min(1, 'query 不能为空'),

  limit: z.number().int().min(1).max(10).default(5),
});

export const searchTool: Tool<typeof searchSchema> = {
  name: 'search',

  description: '搜索知识库中的相关信息。',

  schema: searchSchema,

  async execute(input, context) {
    console.log(`[Search] requestId=${context.requestId}`);

    const documents = [
      {
        title: 'TypeScript 基础',
        content: 'TypeScript 是 JavaScript 的超集，增加了静态类型系统。',
      },

      {
        title: 'AI Agent',
        content: 'AI Agent 是能够感知环境、进行决策、调用工具并完成任务的智能系统。',
      },

      {
        title: 'RAG',
        content: 'RAG 通过检索外部知识增强大语言模型生成能力。',
      },

      {
        title: 'LangGraph',
        content: 'LangGraph 可以用于构建具有状态和复杂工作流的 Agent。',
      },
    ];

    const keyword = input.query.toLowerCase();

    const results = documents
      .filter((document) => {
        return (
          document.title.toLowerCase().includes(keyword) ||
          document.content.toLowerCase().includes(keyword)
        );
      })
      .slice(0, input.limit);

    return {
      query: input.query,

      total: results.length,

      results,
    };
  },
};
