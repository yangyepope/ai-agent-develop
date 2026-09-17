import { llmClient, llmModel } from '../llm.js';

import { SimpleAgent } from '../agent/simple-agent.js';

import { createRunWorkflowTool } from '../agent/run-workflow-tool.js';

export async function runHybridDemo(): Promise<void> {
  console.log();

  console.log('############################');

  console.log('# Demo 3: Agent + Workflow');

  console.log('############################');

  console.log();

  /*
   * Hybrid 模式：
   *   Agent 决定"跑哪个 workflow + 传什么参数"，把执行交给 WorkflowEngine。
   *
   * 这一步真的发 LLM 请求 —— Agent 会从用户输入里抽出
   *   { workflowName: 'orderReport', userId: 1001 }
   * 然后调用 runWorkflow 工具，工具内部用 WorkflowEngine 跑完整流程，
   * 把生成的 report 作为工具返回值喂回给 Agent，Agent 再以 final_answer
   * 把报告文本输出给用户。
   */
  const agent = new SimpleAgent(llmClient, llmModel, [createRunWorkflowTool()]);

  const userInput = '请为用户 1001 生成一份订单报告';

  console.log(`用户输入：${userInput}`);

  console.log();

  const answer = await agent.run(userInput);

  console.log();

  console.log('Hybrid 最终结果：');

  console.log(answer);
}