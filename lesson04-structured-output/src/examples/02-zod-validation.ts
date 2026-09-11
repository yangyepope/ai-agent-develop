import { CodeReviewSchema } from '../schemas/code-review.schema.js';

const mockResponse = {
  summary: '发现SQL性能问题',

  score: 90,

  issues: [
    {
      type: 'performance',

      level: 'high',

      message: '存在全表扫描',

      suggestion: '增加索引',
    },
  ],
};

const result = CodeReviewSchema.parse(mockResponse);

console.log(result);
