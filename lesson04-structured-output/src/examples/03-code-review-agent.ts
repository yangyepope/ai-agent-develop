import { LLMService } from '../services/llm.service.js';

import { StructuredService } from '../services/structured.service.js';

import { CodeReviewSchema } from '../schemas/code-review.schema.js';

import { codeReviewPrompt } from '../prompts/code-review.prompt.js';

async function main() {
  const llm = new LLMService();

  const structured = new StructuredService(llm);

  const result = await structured.generate(
    CodeReviewSchema,

    [
      {
        role: 'system',

        content: codeReviewPrompt,
      },

      {
        role: 'user',

        content: `
        请分析：

        public void save(){

        userDao.save();

        }

`,
      },
    ],
  );

  console.log(JSON.stringify(result, null, 2));
}

main();
