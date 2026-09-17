import { WorkflowEngine } from '../workflow/workflow-engine.js';

import { WorkflowContext } from '../workflow/workflow-context.js';

import { createOrderReportWorkflow } from '../workflow/order-report-workflow.js';

export async function runWorkflowDemo(): Promise<void> {
  console.log();
  console.log('############################');

  console.log('# Demo 1: Workflow');

  console.log('############################');

  const context = new WorkflowContext('帮我生成订单报告');

  context.set('userId', 1001);

  const workflow = createOrderReportWorkflow();

  const engine = new WorkflowEngine();

  await engine.execute(workflow, context);

  console.log();
  console.log('Workflow 最终结果：');

  console.log(context.get<string>('report'));
}
