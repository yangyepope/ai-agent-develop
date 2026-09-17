import type { AgentTool } from '../types/agent.js';

import type { WorkflowDefinition } from '../types/workflow.js';

import { WorkflowContext } from '../workflow/workflow-context.js';

import { WorkflowEngine } from '../workflow/workflow-engine.js';

import { createOrderReportWorkflow } from '../workflow/order-report-workflow.js';

/*
 * workflow 注册表：把"workflow 名字"映射到"创建工作流的工厂函数"。
 *
 * Hybrid 模式下，Agent 从用户输入里识别出要跑哪个 workflow，
 * 我们就按名字查注册表拿到对应的定义，再交给 WorkflowEngine 执行。
 *
 * 后续新增 workflow（例如 refundWorkflow、exportWorkflow）只要
 * 在这里加一行即可，runHybridDemo 不需要改动。
 */
const workflowRegistry: Record<string, () => WorkflowDefinition<WorkflowContext>> = {
  orderReport: createOrderReportWorkflow,
};

export function createRunWorkflowTool(): AgentTool {
  return {
    name: 'runWorkflow',

    description:
      '运行一个已注册的工作流。' +
      '参数：workflowName(字符串，如 orderReport)、userId(数字)。' +
      '会同步执行完整工作流并把最终报告作为字符串返回。',

    async execute(arguments_): Promise<string> {
      const workflowName = arguments_.workflowName;

      const userId = arguments_.userId;

      if (typeof workflowName !== 'string') {
        throw new Error('runWorkflow 缺少参数：workflowName（字符串）');
      }

      if (typeof userId !== 'number' || !Number.isFinite(userId)) {
        throw new Error('runWorkflow 缺少参数：userId（数字）');
      }

      const factory = workflowRegistry[workflowName];

      if (!factory) {
        const available = Object.keys(workflowRegistry).join(', ');

        throw new Error(`未知工作流：${workflowName}。可用：${available}`);
      }

      const workflow = factory();

      /*
       * 这里原本由 AgentWorkflowCoordinator 创建 WorkflowContext；
       * 现在由工具自己负责把 Agent 抽出的参数塞进上下文，让 Agent
       * 只关心"决定跑哪个 + 传什么参数"，WorkflowEngine 不感知 Agent。
       */
      const context = new WorkflowContext(`run ${workflowName}`);

      context.set('userId', userId);

      const engine = new WorkflowEngine();

      await engine.execute(workflow, context);

      const report = context.get<string>('report');

      if (typeof report !== 'string' || report.length === 0) {
        throw new Error(`workflow ${workflowName} 没有产生 report`);
      }

      return report;
    },
  };
}