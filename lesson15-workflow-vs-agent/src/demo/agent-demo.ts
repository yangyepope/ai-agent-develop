import { llmClient, llmModel } from '../llm.js';

import { SimpleAgent } from '../agent/simple-agent.js';

import { weatherTool } from '../agent/agent-tool.js';

export async function runAgentDemo(): Promise<void> {
  console.log();
  console.log('############################');

  console.log('# Demo 2: Agent');

  console.log('############################');

  const agent = new SimpleAgent(llmClient, llmModel, [weatherTool]);

  const answer = await agent.run('北京今天天气怎么样？');

  console.log();
  console.log('Agent 最终回答：');

  console.log(answer);
}
