import type { EvaluationDataset } from '../types/dataset.js';

export const evaluationDataset: EvaluationDataset = {
  name: 'lesson13-agent-evaluation-dataset',

  version: '1.0.0',

  tasks: [
    {
      id: 'task-001',

      input: '查询北京天气',

      expectedToolCalls: [
        {
          toolName: 'weather',

          arguments: {
            city: '北京',
          },
        },
      ],

      expectedAnswer: '北京天气',

      tags: ['weather', 'basic'],
    },

    {
      id: 'task-002',

      input: '查询上海天气',

      expectedToolCalls: [
        {
          toolName: 'weather',

          arguments: {
            city: '上海',
          },
        },
      ],

      expectedAnswer: '上海天气',

      tags: ['weather'],
    },

    {
      id: 'task-003',

      input: '计算 128 * 36',

      expectedToolCalls: [
        {
          toolName: 'calculator',

          arguments: {
            expression: '128 * 36',
          },
        },
      ],

      expectedAnswer: '128 * 36',

      tags: ['calculator'],
    },

    {
      id: 'task-004',

      input: '查询用户 1001 的订单',

      expectedToolCalls: [
        {
          toolName: 'get_orders',

          arguments: {
            userId: '1001',
          },
        },
      ],

      expectedAnswer: '用户 1001 的订单',

      tags: ['order'],
    },
  ],
};
