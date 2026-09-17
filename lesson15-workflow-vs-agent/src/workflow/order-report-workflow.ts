import type { WorkflowDefinition } from '../types/workflow.js';

import { WorkflowContext } from './workflow-context.js';

import { WorkflowStep } from './workflow-step.js';

export function createOrderReportWorkflow(): WorkflowDefinition<WorkflowContext> {
  const queryOrdersStep = new WorkflowStep('query-orders', '查询用户订单', async (context) => {
    const userId = context.get<number>('userId');

    if (!userId) {
      throw new Error('缺少 userId');
    }

    console.log(`  查询用户 ${userId} 的订单`);

    await sleep(300);

    const orders = [
      {
        id: 10001,
        amount: 199,
        status: 'paid',
      },
      {
        id: 10002,
        amount: 299,
        status: 'paid',
      },
      {
        id: 10003,
        amount: 99,
        status: 'cancelled',
      },
    ];

    context.set('orders', orders);

    console.log(`  查询到 ${orders.length} 个订单`);
  });

  const calculateStatisticsStep = new WorkflowStep(
    'calculate-statistics',
    '计算订单统计数据',
    async (context) => {
      const orders = context.get<
        {
          id: number;
          amount: number;
          status: string;
        }[]
      >('orders');

      if (!orders) {
        throw new Error('没有订单数据');
      }

      await sleep(200);

      const paidOrders = orders.filter((order) => order.status === 'paid');

      const totalAmount = paidOrders.reduce((sum, order) => sum + order.amount, 0);

      const statistics = {
        totalOrders: orders.length,

        paidOrders: paidOrders.length,

        totalAmount,
      };

      context.set('statistics', statistics);

      console.log(`  总订单: ${statistics.totalOrders}`);

      console.log(`  已支付订单: ${statistics.paidOrders}`);

      console.log(`  支付金额: ${statistics.totalAmount}`);
    },
  );

  const generateReportStep = new WorkflowStep(
    'generate-report',
    '生成订单报告',
    async (context) => {
      const statistics = context.get<{
        totalOrders: number;
        paidOrders: number;
        totalAmount: number;
      }>('statistics');

      if (!statistics) {
        throw new Error('缺少统计数据');
      }

      await sleep(200);

      const report = `
                订单分析报告

                总订单数：${statistics.totalOrders}

                已支付订单：${statistics.paidOrders}

                支付金额：${statistics.totalAmount} 元
                `;

      context.set('report', report);

      console.log(report);
    },
  );

  return {
    name: 'order-report-workflow',

    description: '按照固定流程生成订单报告',

    steps: [queryOrdersStep, calculateStatisticsStep, generateReportStep],
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
