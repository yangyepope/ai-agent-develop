import { llmClient } from '../llm.js';

import { config } from '../config.js';

async function main() {
  const response = await llmClient.chat.completions.create({
    model: config.llm.model,

    messages: [
      {
        role: 'system',

        content: `
            你是一个代码审核专家。

            请输出JSON格式。
            `,
      },

      {
        role: 'user',

        content: `
            分析：

            public void save(){

            userDao.save();

            }

            `,
      },
    ],
  });

  console.log(response.choices[0]?.message.content);
}

main();
